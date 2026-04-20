// abnt-formatter.js — Formatação ABNT NBR 6023:2018

const ABNT = {

  // ─── NORMALIZAR MÊS ────────────────────────────────────────────────────────
  // Aceita nome em inglês (CrossRef), português ou abreviatura
  normalizarMes(mes) {
    if (!mes) return '';
    const m = String(mes).trim().toLowerCase();
    const mapa = {
      // inglês
      january: 'jan.', february: 'fev.', march: 'mar.', april: 'abr.',
      may: 'maio', june: 'jun.', july: 'jul.', august: 'ago.',
      september: 'set.', october: 'out.', november: 'nov.', december: 'dez.',
      jan: 'jan.', feb: 'fev.', mar: 'mar.', apr: 'abr.',
      jun: 'jun.', jul: 'jul.', aug: 'ago.', sep: 'set.',
      sept: 'set.', oct: 'out.', nov: 'nov.', dec: 'dez.',
      // português
      janeiro: 'jan.', fevereiro: 'fev.', março: 'mar.', abril: 'abr.',
      maio: 'maio', junho: 'jun.', julho: 'jul.', agosto: 'ago.',
      setembro: 'set.', outubro: 'out.', novembro: 'nov.', dezembro: 'dez.',
      // já abreviado
      'jan.': 'jan.', 'fev.': 'fev.', 'mar.': 'mar.', 'abr.': 'abr.',
      'jun.': 'jun.', 'jul.': 'jul.', 'ago.': 'ago.', 'set.': 'set.',
      'out.': 'out.', 'nov.': 'nov.', 'dez.': 'dez.',
    };
    return mapa[m] || mes;
  },

  // ─── LIMPAR HTML (CrossRef pode devolver <i>, <b>, &amp;, etc.) ───────────
  limparHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  },

  // ─── FORMATAR EDIÇÃO ───────────────────────────────────────────────────────
  // Garante "3. ed." sem duplicar ponto
  formatEdicao(edicao) {
    if (!edicao) return '';
    const s = String(edicao).trim().replace(/\.?\s*ed\.?$/i, '').trim();
    return `${s}. ed.`;
  },

  // ─── FORMATAR AUTORES ──────────────────────────────────────────────────────
  formatAutores(autoresStr) {
    if (!autoresStr || !autoresStr.trim()) return '';
    const lista = autoresStr.split(/[;|]/).map(a => a.trim()).filter(Boolean);
    const formatar = (autor) => {
      if (autor.includes(',')) {
        const [sob, ...resto] = autor.split(',');
        return `${sob.trim().toUpperCase()}, ${resto.join(',').trim()}`;
      }
      const partes = autor.trim().split(/\s+/);
      if (partes.length === 1) return partes[0].toUpperCase();
      const sobrenome = partes[partes.length - 1];
      const prenome = partes.slice(0, -1).join(' ');
      return `${sobrenome.toUpperCase()}, ${prenome}`;
    };
    if (lista.length > 3) return formatar(lista[0]) + ' et al.';
    return lista.map(formatar).join('; ');
  },

  // ─── LIVRO ─────────────────────────────────────────────────────────────────
  livro({ autores, titulo, subtitulo, edicao, local, editora, ano, doi }) {
    const tit = this.limparHTML(titulo);
    const sub = this.limparHTML(subtitulo);
    const loc = local  || '[S. l.]';
    const ed  = editora || '[s.n.]';
    const yr  = ano    || '[s.d.]';

    let r = this.formatAutores(autores) + '. ';
    r += tit ? `<strong>${tit}</strong>` : '[sem título]';
    if (sub) r += `: ${sub}`;
    r += '.';
    if (edicao) r += ` ${this.formatEdicao(edicao)}`;
    r += ` ${loc}: ${ed}, ${yr}.`;
    if (doi) r += ` DOI: ${doi}.`;
    return r.trim();
  },

  // ─── ARTIGO ────────────────────────────────────────────────────────────────
  artigo({ autores, titulo, revista, local, volume, numero, paginas, mes, ano, doi }) {
    const tit = this.limparHTML(titulo);
    const rev = this.limparHTML(revista);
    const mesAbrev = this.normalizarMes(mes);

    let r = this.formatAutores(autores) + '. ';
    r += tit ? `${tit}. ` : '[sem título]. ';
    if (rev) r += `<strong>${rev}</strong>`;
    if (local) r += `, ${local}`;
    if (volume) r += `, v. ${volume}`;
    if (numero) r += `, n. ${numero}`;
    if (paginas) r += `, p. ${paginas}`;
    // mês e ano juntos na mesma posição
    if (mesAbrev && ano) r += `, ${mesAbrev} ${ano}`;
    else if (ano)        r += `, ${ano}`;
    else if (mesAbrev)   r += `, ${mesAbrev}`;
    // garante ponto final antes do DOI
    if (!r.endsWith('.')) r += '.';
    if (doi) r += ` DOI: ${doi}.`;
    return r.trim();
  },

  // ─── TESE / DISSERTAÇÃO ────────────────────────────────────────────────────
  // nivel aceita: 'tese', 'doutorado', 'dissertacao', 'mestrado'
  tese({ autores, titulo, subtitulo, ano, folhas, nivel, curso, instituicao, local }) {
    const tit = this.limparHTML(titulo);
    const sub = this.limparHTML(subtitulo);
    const n   = String(nivel || '').toLowerCase();
    const ehMestrado = n === 'mestrado' || n === 'dissertacao';
    const tipoLabel  = ehMestrado ? 'Dissertação (Mestrado' : 'Tese (Doutorado';

    let r = this.formatAutores(autores) + '. ';
    r += tit ? `<strong>${tit}</strong>` : '[sem título]';
    if (sub) r += `: ${sub}`;
    r += '.';
    if (ano) r += ` ${ano}.`;
    if (folhas) r += ` ${folhas} f.`;
    r += ` ${tipoLabel}`;
    if (curso) r += ` em ${curso}`;
    r += ') –';
    if (instituicao) r += ` ${instituicao}`;
    const loc = local || '[S. l.]';
    r += `, ${loc}`;
    if (ano) r += `, ${ano}`;
    r += '.';
    return r.trim();
  },

  dissertacao(dados) {
    return this.tese({ ...dados, nivel: 'mestrado' });
  },

  // ─── CAPÍTULO ──────────────────────────────────────────────────────────────
  capitulo({ autores, titulo_cap, autores_org, titulo_livro, local, editora, ano, paginas }) {
    const titCap   = this.limparHTML(titulo_cap);
    const titLivro = this.limparHTML(titulo_livro);
    const loc = local   || '[S. l.]';
    const ed  = editora || '[s.n.]';
    const yr  = ano     || '[s.d.]';

    let r = this.formatAutores(autores) + '. ';
    r += titCap ? `${titCap}. ` : '[sem título]. ';
    r += 'In: ';
    if (autores_org) r += `${this.formatAutores(autores_org)} (org.). `;
    r += titLivro ? `<strong>${titLivro}</strong>` : '[sem título do livro]';
    r += `.`;
    r += ` ${loc}: ${ed}, ${yr}.`;
    if (paginas) r += ` p. ${paginas}.`;
    return r.trim();
  },

  // ─── SITE ──────────────────────────────────────────────────────────────────
  site({ autores, titulo, local, ano, url, acesso }) {
    const tit = this.limparHTML(titulo);
    let r = autores ? this.formatAutores(autores) + '. ' : '';
    r += tit ? `<strong>${tit}</strong>` : '[sem título]';
    r += '.';
    if (local) r += ` ${local},`;
    if (ano) r += ` ${ano}.`;
    if (url) r += ` Disponível em: &lt;${url}&gt;.`;
    if (acesso) r += ` Acesso em: ${acesso}.`;
    return r.trim();
  },

  // ─── DISPATCHER ────────────────────────────────────────────────────────────
  formatar(tipo, dados) {
    switch (tipo) {
      case 'livro':       return this.livro(dados);
      case 'artigo':      return this.artigo(dados);
      case 'tese':        return this.tese(dados);
      case 'dissertacao': return this.dissertacao(dados);
      case 'capitulo':    return this.capitulo(dados);
      case 'site':        return this.site(dados);
      default:            return this.livro(dados);
    }
  },

  // ─── TEXTO PURO (remove HTML para salvar no banco) ─────────────────────────
  textoPlano(html) {
    return this.limparHTML(
      html.replace(/<strong>/gi, '').replace(/<\/strong>/gi, '')
    ).replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  },
};
