// abnt-formatter.js — Formatação ABNT NBR 6023:2018

const ABNT = {

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

  livro({ autores, titulo, subtitulo, edicao, local, editora, ano }) {
    let r = this.formatAutores(autores) + '. ';
    r += titulo ? `<strong>${titulo}</strong>` : '[sem título]';
    if (subtitulo) r += `: ${subtitulo}`;
    r += '.';
    if (edicao) r += ` ${edicao}. ed.`;
    if (local) r += ` ${local}:`;
    if (editora) r += ` ${editora},`;
    if (ano) r += ` ${ano}.`;
    return r.trim();
  },

  artigo({ autores, titulo, revista, local, volume, numero, paginas, mes, ano, doi }) {
    let r = this.formatAutores(autores) + '. ';
    r += titulo ? `${titulo}. ` : '[sem título]. ';
    if (revista) r += `<strong>${revista}</strong>`;
    if (local) r += `, ${local}`;
    if (volume) r += `, v. ${volume}`;
    if (numero) r += `, n. ${numero}`;
    if (paginas) r += `, p. ${paginas}`;
    if (mes) r += `, ${mes}`;
    if (ano) r += `, ${ano}`;
    r += '.';
    if (doi) r += ` DOI: ${doi}.`;
    return r.trim();
  },

  tese({ autores, titulo, subtitulo, ano, folhas, nivel, curso, instituicao, local }) {
    let r = this.formatAutores(autores) + '. ';
    r += titulo ? `<strong>${titulo}</strong>` : '[sem título]';
    if (subtitulo) r += `: ${subtitulo}`;
    r += '.';
    if (ano) r += ` ${ano}.`;
    if (folhas) r += ` ${folhas} f.`;
    const tipoTese = nivel === 'mestrado' ? 'Dissertação (Mestrado' : 'Tese (Doutorado';
    r += ` ${tipoTese}`;
    if (curso) r += ` em ${curso}`;
    r += ')';
    if (instituicao) r += ` – ${instituicao}`;
    if (local) r += `, ${local}`;
    if (ano) r += `, ${ano}`;
    r += '.';
    return r.trim();
  },

  dissertacao(dados) {
    return this.tese({ ...dados, nivel: 'mestrado' });
  },

  capitulo({ autores, titulo_cap, autores_org, titulo_livro, local, editora, ano, paginas }) {
    let r = this.formatAutores(autores) + '. ';
    r += titulo_cap ? `${titulo_cap}. ` : '[sem título]. ';
    r += 'In: ';
    if (autores_org) r += `${this.formatAutores(autores_org)} (org.). `;
    r += titulo_livro ? `<strong>${titulo_livro}</strong>` : '[sem título do livro]';
    r += '.';
    if (local) r += ` ${local}:`;
    if (editora) r += ` ${editora},`;
    if (ano) r += ` ${ano}.`;
    if (paginas) r += ` p. ${paginas}.`;
    return r.trim();
  },

  site({ autores, titulo, local, ano, url, acesso }) {
    let r = autores ? this.formatAutores(autores) + '. ' : '';
    r += titulo ? `<strong>${titulo}</strong>` : '[sem título]';
    r += '.';
    if (local) r += ` ${local},`;
    if (ano) r += ` ${ano}.`;
    if (url) r += ` Disponível em: &lt;${url}&gt;.`;
    if (acesso) r += ` Acesso em: ${acesso}.`;
    return r.trim();
  },

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

  // Remove tags HTML para salvar texto puro
  textoPlano(html) {
    return html.replace(/<strong>/g, '').replace(/<\/strong>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }
};
