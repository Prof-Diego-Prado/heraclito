// citation-manager.js — Busca de metadados por DOI e ISBN
// Depende de: abnt-formatter.js (objeto ABNT deve estar carregado antes)

const CitationManager = {

  // ─── CROSSREF API — busca por DOI ────────────────────────────────────────
  async buscarPorDOI(doi) {
    const doiLimpo = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    if (!doiLimpo) throw new Error('Informe um DOI válido.')

    const resp = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(doiLimpo)}`,
      { headers: { 'User-Agent': 'Heraclito/1.0 (mailto:pg407057@uem.br)' } }
    )
    if (resp.status === 404) throw new Error('DOI não encontrado na base CrossRef.')
    if (!resp.ok)            throw new Error(`CrossRef: erro ${resp.status}.`)

    const json = await resp.json()
    return this._crossrefParaFormulario(json.message, doiLimpo)
  },

  // ─── GOOGLE BOOKS API — busca por ISBN ───────────────────────────────────
  async buscarPorISBN(isbn) {
    const isbnLimpo = isbn.replace(/[-\s]/g, '')
    if (!isbnLimpo) throw new Error('Informe um ISBN válido.')

    const resp = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnLimpo}&maxResults=1`
    )
    if (!resp.ok) throw new Error(`Google Books: erro ${resp.status}.`)

    const json = await resp.json()
    if (!json.totalItems || !json.items?.length)
      throw new Error('ISBN não encontrado na base Google Books.')

    return this._googleBooksParaFormulario(json.items[0].volumeInfo, isbnLimpo)
  },

  // ─── CONVERSÃO: CrossRef → campos do formulário ───────────────────────────
  _crossrefParaFormulario(msg, doi) {
    const meses = ['jan.','fev.','mar.','abr.','maio','jun.',
                   'jul.','ago.','set.','out.','nov.','dez.']

    const autores = (msg.author || [])
      .map(a => {
        if (a.family && a.given) return `${a.family}, ${a.given}`
        if (a.family)            return a.family
        return a.name || a.literal || ''
      })
      .filter(Boolean).join('; ')

    const dateParts = (
      msg.published?.['date-parts']?.[0] ||
      msg['published-print']?.['date-parts']?.[0] ||
      msg['published-online']?.['date-parts']?.[0] || []
    )
    const ano    = dateParts[0] ? String(dateParts[0]) : ''
    const mesIdx = dateParts[1]

    // CrossRef às vezes coloca subtítulo em subtitle[], às vezes junto com ':' no title
    const titulos    = msg.title    || []
    const subtitulos = msg.subtitle || []
    let titulo    = titulos[0]    || ''
    let subtitulo = subtitulos[0] || ''
    if (!subtitulo && titulo.includes(':')) {
      const partes = titulo.split(':')
      titulo    = partes[0].trim()
      subtitulo = partes.slice(1).join(':').trim()
    }

    return {
      tipo:      this._tipoCrossref(msg.type),
      autores,
      titulo,
      subtitulo,
      ano,
      mes:       mesIdx ? meses[mesIdx - 1] : '',
      editora:   msg.publisher || '',
      local:     msg['publisher-location'] || '',
      doi,
      url:       msg.URL || '',
      revista:   (msg['container-title'] || [])[0] || '',
      volume:    msg.volume || '',
      numero:    msg.issue  || '',
      paginas:   msg.page   || '',
    }
  },

  // ─── CONVERSÃO: Google Books → campos do formulário ──────────────────────
  _googleBooksParaFormulario(info, isbn) {
    const autores = (info.authors || [])
      .map(nome => {
        const p = nome.trim().split(/\s+/)
        if (p.length === 1) return p[0].toUpperCase()
        return `${p[p.length - 1]}, ${p.slice(0, -1).join(' ')}`
      })
      .join('; ')

    // Separar título e subtítulo
    const tituloCompleto = info.title || ''
    const subtituloGBooks = info.subtitle || ''
    let titulo    = tituloCompleto
    let subtitulo = subtituloGBooks
    if (!subtitulo && titulo.includes(':')) {
      const p  = titulo.split(':')
      titulo    = p[0].trim()
      subtitulo = p.slice(1).join(':').trim()
    }

    const ids    = info.industryIdentifiers || []
    const isbn13 = ids.find(i => i.type === 'ISBN_13')?.identifier || isbn
    const isbn10 = ids.find(i => i.type === 'ISBN_10')?.identifier || ''

    return {
      tipo:      'livro',
      autores,
      titulo,
      subtitulo,
      ano:       String(info.publishedDate?.slice(0, 4) || ''),
      editora:   info.publisher || '',
      local:     '',
      paginas:   info.pageCount ? String(info.pageCount) : '',
      doi:       '',
      url:       info.canonicalVolumeLink || '',
      _isbn13:   isbn13,
      _isbn10:   isbn10,
    }
  },

  // ─── TIPO CROSSREF → TIPO DO FORMULÁRIO ──────────────────────────────────
  _tipoCrossref(type) {
    const mapa = {
      'journal-article':     'artigo',
      'book':                'livro',
      'book-chapter':        'capitulo',
      'edited-book':         'livro',
      'monograph':           'livro',
      'dissertation':        'tese',
      'proceedings-article': 'artigo',
      'posted-content':      'artigo',
      'report':              'livro',
      'reference-entry':     'livro',
    }
    return mapa[type] || 'livro'
  },

  // ─── FORMATAR ABNT (delega ao abnt-formatter.js) ─────────────────────────
  formatarABNT(dados, tipo) {
    if (typeof ABNT === 'undefined') return ''
    return ABNT.formatar(tipo || dados.tipo, dados)
  },

  // ─── CONVERTER PARA CITEPROC-JSON (para uso futuro com Citation.js) ──────
  converterParaCiteproc(dados, tipo) {
    const autoresParsed = (dados.autores || '')
      .split(/[;|]/).map(a => {
        a = a.trim()
        if (!a) return null
        if (a.includes(',')) {
          const [family, ...resto] = a.split(',')
          return { family: family.trim(), given: resto.join(',').trim() }
        }
        const p = a.split(/\s+/)
        return { family: p[p.length - 1], given: p.slice(0, -1).join(' ') }
      }).filter(Boolean)

    const base = {
      id:               'ref-1',
      type:             this._tipoParaCsl(tipo),
      title:            dados.titulo || '',
      author:           autoresParsed,
      issued:           dados.ano ? { 'date-parts': [[parseInt(dados.ano)]] } : undefined,
      publisher:        dados.editora   || undefined,
      'publisher-place': dados.local   || undefined,
      DOI:              dados.doi       || undefined,
      URL:              dados.url       || undefined,
    }

    switch (tipo) {
      case 'artigo':
        return { ...base,
          'container-title': dados.revista,
          volume: dados.volume, issue: dados.numero, page: dados.paginas }
      case 'capitulo':
        return { ...base,
          'container-title': dados.titulo_livro, page: dados.paginas }
      case 'tese':
        return { ...base, genre: 'Tese (Doutorado)', publisher: dados.instituicao }
      case 'dissertacao':
        return { ...base, genre: 'Dissertação (Mestrado)', publisher: dados.instituicao }
      default:
        return base
    }
  },

  _tipoParaCsl(tipo) {
    const mapa = {
      livro: 'book', artigo: 'article-journal',
      tese: 'thesis', dissertacao: 'thesis',
      capitulo: 'chapter', site: 'webpage',
    }
    return mapa[tipo] || 'book'
  },
}
