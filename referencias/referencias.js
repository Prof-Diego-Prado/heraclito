// referencias.js — Lógica principal do Gerenciador de Referências

const SUPABASE_URL      = 'https://scwhsfutncfbwgvqsgbf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mcvvhFe5AIdQLN4BQAhjEw_y1bvEbvT';

// Campos visíveis por tipo de referência
const CAMPOS_POR_TIPO = {
  livro:       ['autores','titulo','subtitulo','edicao','local','editora','ano'],
  artigo:      ['autores','titulo','revista','local','volume','numero','paginas','mes','ano','doi','url'],
  tese:        ['autores','titulo','subtitulo','ano','folhas','curso','instituicao','local'],
  dissertacao: ['autores','titulo','subtitulo','ano','folhas','curso','instituicao','local'],
  capitulo:    ['autores','titulo_cap','autores_org','titulo_livro','local','editora','ano','paginas'],
  site:        ['autores','titulo','local','ano','url','acesso'],
};

const App = {
  db: null,
  session: null,
  referencias: [],
  pdfNome: null,

  async init() {
    const { createClient } = supabase;
    this.db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Inicializar pdf.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    this.bindEvents();
    await this.checkAuth();
  },

  async checkAuth() {
    const { data: { session } } = await this.db.auth.getSession();
    this.session = session;
    this.atualizarStatusAuth();
    if (session) await this.carregarReferencias();

    this.db.auth.onAuthStateChange((_ev, sess) => {
      this.session = sess;
      this.atualizarStatusAuth();
      if (sess) this.carregarReferencias();
    });
  },

  atualizarStatusAuth() {
    const badge = document.getElementById('auth-badge');
    const loginPanel = document.getElementById('login-panel');
    const mainPanel  = document.getElementById('main-panel');
    if (this.session) {
      badge.textContent = '● Conectado';
      badge.className = 'text-xs font-medium text-green-600';
      loginPanel.classList.add('hidden');
      mainPanel.classList.remove('hidden');
    } else {
      badge.textContent = '○ Desconectado';
      badge.className = 'text-xs font-medium text-red-500';
      loginPanel.classList.remove('hidden');
      mainPanel.classList.add('hidden');
    }
  },

  async login() {
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    const btn   = document.getElementById('btn-login');
    const erro  = document.getElementById('login-erro');
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    erro.textContent = '';
    const { error } = await this.db.auth.signInWithPassword({ email, password: senha });
    if (error) {
      erro.textContent = error.message;
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  },

  async logout() {
    await this.db.auth.signOut();
    this.referencias = [];
    document.getElementById('lista-referencias').innerHTML = '';
  },

  bindEvents() {
    // Login / Logout
    document.getElementById('btn-login').addEventListener('click', () => this.login());
    document.getElementById('login-senha').addEventListener('keydown', e => {
      if (e.key === 'Enter') this.login();
    });
    document.getElementById('btn-logout').addEventListener('click', () => this.logout());

    // Tipo de referência → atualiza campos
    document.getElementById('tipo').addEventListener('change', (e) => {
      this.atualizarCampos(e.target.value);
      this.atualizarPreview();
    });

    // Preview em tempo real
    document.getElementById('form-ref').addEventListener('input', () => this.atualizarPreview());

    // Upload de PDF
    const dropzone = document.getElementById('pdf-dropzone');
    const fileInput = document.getElementById('pdf-input');
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('border-indigo-500','bg-indigo-50'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('border-indigo-500','bg-indigo-50'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('border-indigo-500','bg-indigo-50');
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') this.processarPDF(file);
    });
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) this.processarPDF(file);
    });

    // Salvar referência
    document.getElementById('btn-salvar').addEventListener('click', () => this.salvarReferencia());

    // Limpar formulário
    document.getElementById('btn-limpar').addEventListener('click', () => this.limparForm());

    // Copiar citação
    document.getElementById('btn-copiar').addEventListener('click', () => this.copiarCitacao());
  },

  atualizarCampos(tipo) {
    const visiveis = CAMPOS_POR_TIPO[tipo] || CAMPOS_POR_TIPO.livro;
    document.querySelectorAll('.campo-ref').forEach(el => {
      const campo = el.dataset.campo;
      el.classList.toggle('hidden', !visiveis.includes(campo));
    });
    // Label especial para tese/dissertação
    const labelNivel = document.getElementById('label-nivel');
    if (labelNivel) {
      labelNivel.classList.toggle('hidden', tipo !== 'tese' && tipo !== 'dissertacao');
    }
  },

  coletarDados() {
    const tipo = document.getElementById('tipo').value;
    const campos = CAMPOS_POR_TIPO[tipo] || [];
    const dados = {};
    campos.forEach(campo => {
      const el = document.getElementById(`campo-${campo}`);
      if (el) dados[campo] = el.value.trim();
    });
    if (tipo === 'tese' || tipo === 'dissertacao') {
      dados.nivel = tipo;
    }
    return dados;
  },

  atualizarPreview() {
    const tipo  = document.getElementById('tipo').value;
    const dados = this.coletarDados();
    const html  = ABNT.formatar(tipo, dados);
    document.getElementById('preview-abnt').innerHTML = html || '<span class="text-gray-400">Preencha os campos para ver a citação…</span>';
  },

  async processarPDF(file) {
    this.pdfNome = file.name;
    const statusEl = document.getElementById('pdf-status');
    statusEl.textContent = `Processando ${file.name}…`;
    statusEl.className = 'text-xs text-indigo-600 mt-2';

    try {
      const buffer = await file.arrayBuffer();
      const pdf    = await pdfjsLib.getDocument({ data: buffer }).promise;
      const meta   = await pdf.getMetadata();
      const info   = meta.info || {};

      // Preencher campos com metadados do PDF
      if (info.Title)  this.setField('titulo', info.Title);
      if (info.Author) this.setField('autores', info.Author);

      // Extrair ano da data de criação
      if (info.CreationDate) {
        const match = info.CreationDate.match(/(\d{4})/);
        if (match) this.setField('ano', match[1]);
      }

      // Extrair DOI do texto das primeiras 3 páginas
      const doi = await this.extrairDOI(pdf);
      if (doi) this.setField('doi', doi);

      statusEl.textContent = `✓ Metadados extraídos de ${file.name}`;
      statusEl.className = 'text-xs text-green-600 mt-2';
      this.atualizarPreview();
    } catch (err) {
      statusEl.textContent = `Erro ao ler PDF: ${err.message}`;
      statusEl.className = 'text-xs text-red-500 mt-2';
    }
  },

  async extrairDOI(pdf) {
    const paginas = Math.min(pdf.numPages, 3);
    for (let i = 1; i <= paginas; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      const texto   = content.items.map(item => item.str).join(' ');
      const match   = texto.match(/\b(10\.\d{4,9}\/[^\s"<>]+)/);
      if (match) return match[1];
    }
    return null;
  },

  setField(id, valor) {
    const el = document.getElementById(`campo-${id}`);
    if (el && !el.value) el.value = valor;
  },

  async salvarReferencia() {
    if (!this.session) return alert('Faça login para salvar.');
    const tipo   = document.getElementById('tipo').value;
    const dados  = this.coletarDados();
    const html   = ABNT.formatar(tipo, dados);
    const texto  = ABNT.textoPlano(html);

    if (!dados.titulo && !dados.titulo_cap) {
      return alert('Informe ao menos o título da referência.');
    }

    const btn = document.getElementById('btn-salvar');
    btn.disabled = true;
    btn.textContent = 'Salvando…';

    const registro = {
      tipo,
      autores:          dados.autores || dados.autores_org || null,
      titulo:           dados.titulo || dados.titulo_cap || dados.titulo_livro,
      subtitulo:        dados.subtitulo || null,
      ano:              dados.ano ? parseInt(dados.ano) : null,
      editora:          dados.editora || null,
      local_publicacao: dados.local || null,
      doi:              dados.doi || null,
      url:              dados.url || null,
      revista:          dados.revista || null,
      volume:           dados.volume || null,
      numero:           dados.numero || null,
      paginas:          dados.paginas || null,
      edicao:           dados.edicao || null,
      instituicao:      dados.instituicao || null,
      nivel_academico:  tipo === 'tese' ? 'doutorado' : tipo === 'dissertacao' ? 'mestrado' : null,
      citacao_abnt:     texto,
      pdf_nome:         this.pdfNome || null,
      created_by:       this.session.user.id,
    };

    const { data, error } = await this.db.from('referencias').insert(registro).select().single();

    btn.disabled = false;
    btn.textContent = 'Salvar no Supabase';

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      this.referencias.unshift(data);
      this.renderLista();
      this.limparForm();
      this.mostrarToast('Referência salva com sucesso!');
    }
  },

  async carregarReferencias() {
    const { data, error } = await this.db
      .from('referencias')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) {
      this.referencias = data;
      this.renderLista();
    }
  },

  async excluirReferencia(id) {
    if (!confirm('Excluir esta referência?')) return;
    const { error } = await this.db.from('referencias').delete().eq('id', id);
    if (!error) {
      this.referencias = this.referencias.filter(r => r.id !== id);
      this.renderLista();
    }
  },

  renderLista() {
    const container = document.getElementById('lista-referencias');
    if (!this.referencias.length) {
      container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Nenhuma referência salva ainda.</p>';
      return;
    }
    container.innerHTML = this.referencias.map(ref => `
      <div class="ref-card border border-gray-200 rounded-lg p-3 bg-white hover:border-indigo-300 transition-colors">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <span class="inline-block text-xs font-medium bg-indigo-100 text-indigo-700 rounded px-1.5 py-0.5 mb-1">${ref.tipo}</span>
            <p class="text-sm text-gray-800 leading-relaxed">${ref.citacao_abnt || '—'}</p>
          </div>
          <div class="flex gap-1 shrink-0">
            <button onclick="App.copiarTexto('${ref.id}')" title="Copiar" class="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors rounded hover:bg-indigo-50">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="App.excluirReferencia('${ref.id}')" title="Excluir" class="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  },

  copiarTexto(id) {
    const ref = this.referencias.find(r => r.id === id);
    if (ref && ref.citacao_abnt) {
      navigator.clipboard.writeText(ref.citacao_abnt);
      this.mostrarToast('Citação copiada!');
    }
  },

  copiarCitacao() {
    const preview = document.getElementById('preview-abnt');
    const texto = preview.innerText;
    if (texto) {
      navigator.clipboard.writeText(texto);
      this.mostrarToast('Citação copiada!');
    }
  },

  limparForm() {
    document.getElementById('form-ref').querySelectorAll('input, select, textarea').forEach(el => {
      if (el.id !== 'tipo') el.value = '';
    });
    this.pdfNome = null;
    document.getElementById('pdf-status').textContent = '';
    document.getElementById('pdf-input').value = '';
    this.atualizarPreview();
  },

  mostrarToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      toast.classList.remove('opacity-100', 'translate-y-0');
    }, 2500);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
