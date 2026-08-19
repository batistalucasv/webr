/**
 * webr2 — aba Pacotes (catálogo popular + extras instalados no R).
 * Lista compacta: nome + estado. Sem descrições.
 */

const PKG_NAME_RE = /^[A-Za-z][A-Za-z0-9.]*$/;

const SYSTEM_PACKAGES = new Set([
  'base', 'compiler', 'datasets', 'graphics', 'grDevices', 'grid', 'methods',
  'parallel', 'splines', 'stats', 'stats4', 'tcltk', 'tools', 'translations',
  'utils', 'webr'
]);

const CATEGORIES = [
  { id: 'core', title: 'Ecossistema Completo', icon: 'bi-stars' },
  { id: 'plots', title: 'Gráficos', icon: 'bi-palette-fill' },
  { id: 'stats', title: 'Estatística', icon: 'bi-graph-up-arrow' },
  { id: 'bio', title: 'Bio / Ecologia / Agro', icon: 'bi-tree-fill' },
  { id: 'tables', title: 'Tabelas', icon: 'bi-table' },
  { id: 'custom', title: 'Outros instalados', icon: 'bi-box-seam' }
];

const POPULAR_PACKAGES = [
  { name: 'tidyverse', category: 'core', featured: true },
  { name: 'patchwork', category: 'plots' },
  { name: 'ggrepel', category: 'plots' },
  { name: 'scales', category: 'plots' },
  { name: 'viridis', category: 'plots' },
  { name: 'ggpubr', category: 'plots' },
  { name: 'broom', category: 'stats' },
  { name: 'car', category: 'stats' },
  { name: 'emmeans', category: 'stats' },
  { name: 'corrplot', category: 'stats' },
  { name: 'vegan', category: 'bio' },
  { name: 'agricolae', category: 'bio' },
  { name: 'ape', category: 'bio' },
  { name: 'knitr', category: 'tables' },
  { name: 'skimr', category: 'tables' }
];

const STATUS_LABEL = {
  available: 'Não instalado',
  loading: 'Carregando…',
  installed: 'Instalado',
  loaded: 'Ativo'
};

let deps = {
  getWebR: () => null,
  unpackWebRJs: (v) => v,
  showToast: () => {},
  appendConsoleLine: () => {},
  updateEnvironment: () => {}
};

let currentPkgFilter = 'all';
let currentPkgSearch = '';
let extraInstalled = [];
const pending = new Map();
let uiBound = false;
let lastInstalledSet = new Set();
let lastLoadedSet = new Set();

function catalogNames() {
  return POPULAR_PACKAGES.map((p) => p.name);
}

function toNameArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.flatMap((v) => toNameArray(v)).filter(Boolean);
  }
  if (typeof value === 'string') return value ? [value] : [];
  return [];
}

export function isSystemPackage(name) {
  return !name || SYSTEM_PACKAGES.has(name);
}

/**
 * Une o catálogo popular com pacotes instalados (e pendentes) que não estão nele.
 * Pacotes base/recommended/webr ficam de fora da lista extra.
 */
export function mergePackageLists(popular, installed, extras = []) {
  const catalog = new Set((popular || []).filter(Boolean));
  const seen = new Set(catalog);
  const merged = [];

  const pushExtra = (name) => {
    if (!name || !PKG_NAME_RE.test(name) || isSystemPackage(name) || seen.has(name)) return;
    seen.add(name);
    merged.push(name);
  };

  (installed || []).forEach(pushExtra);
  (extras || []).forEach(pushExtra);
  merged.sort((a, b) => a.localeCompare(b));
  return merged;
}

function resolveStatus(pkg) {
  const pend = pending.get(pkg);
  if (pend === 'install' || pend === 'load') return 'loading';
  if (lastLoadedSet.has(pkg)) return 'loaded';
  if (lastInstalledSet.has(pkg)) return 'installed';
  return 'available';
}

function statusLabel(pkg, status) {
  if (pending.get(pkg) === 'install') return 'Instalando…';
  if (pending.get(pkg) === 'load') return 'Carregando…';
  return STATUS_LABEL[status] || STATUS_LABEL.available;
}

function actionForStatus(status) {
  if (status === 'loaded' || status === 'loading') return null;
  if (status === 'installed') return 'load';
  return 'install';
}

function renderRow(pkg, { featured = false, custom = false } = {}) {
  const status = resolveStatus(pkg);
  const item = document.createElement('div');
  item.className = 'pkg-list-item';
  if (featured) item.classList.add('pkg-item-featured');
  if (custom) item.classList.add('pkg-item-custom');
  item.setAttribute('data-pkg', pkg);
  item.setAttribute('data-status', status);
  if (custom) item.setAttribute('data-pkg-source', 'custom');

  const nameEl = document.createElement('span');
  nameEl.className = 'pkg-name';
  nameEl.textContent = pkg;

  const badge = document.createElement('span');
  badge.className = `pkg-status-badge ${status}`;
  badge.textContent = statusLabel(pkg, status);

  const actions = document.createElement('div');
  actions.className = 'pkg-item-actions';
  actions.appendChild(badge);

  const action = actionForStatus(status);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-sm btn-quick-pkg';
  btn.setAttribute('data-pkg', pkg);

  if (status === 'loaded') {
    btn.classList.add('btn-pkg-loaded');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-check-all"></i> Pronto';
    btn.title = `Pacote ${pkg} está carregado e pronto para uso no R`;
  } else if (status === 'loading') {
    btn.classList.add('btn-secondary');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i>';
    btn.title = pending.get(pkg) === 'load'
      ? `Carregando library(${pkg})`
      : `Instalando ${pkg}`;
  } else if (action === 'load') {
    btn.classList.add('btn-pkg-load');
    btn.setAttribute('data-action', 'load');
    btn.innerHTML = '<i class="bi bi-play-circle"></i> Carregar';
    btn.title = `Clique para carregar library(${pkg})`;
  } else {
    btn.classList.add('btn-secondary');
    btn.innerHTML = '<i class="bi bi-download"></i> Instalar';
    btn.title = `Clique para instalar ${pkg}`;
  }

  actions.appendChild(btn);
  item.appendChild(nameEl);
  item.appendChild(actions);
  return item;
}

function renderCatalog() {
  const root = document.getElementById('pkg-catalog');
  if (!root) return;

  extraInstalled = mergePackageLists(
    catalogNames(),
    extraInstalled,
    Array.from(pending.keys())
  );

  root.textContent = '';

  CATEGORIES.forEach((cat) => {
    const names = cat.id === 'custom'
      ? extraInstalled
      : POPULAR_PACKAGES.filter((p) => p.category === cat.id).map((p) => p.name);
    if (!names.length) return;

    const group = document.createElement('div');
    group.className = 'pkg-category-group';
    group.setAttribute('data-pkg-category', cat.id);

    const title = document.createElement('h4');
    title.className = 'pkg-category-title';
    title.innerHTML = `<i class="bi ${cat.icon}"></i> `;
    title.appendChild(document.createTextNode(cat.title));
    group.appendChild(title);

    const list = document.createElement('div');
    list.className = 'pkg-list';
    names.forEach((name) => {
      const meta = POPULAR_PACKAGES.find((p) => p.name === name);
      list.appendChild(renderRow(name, {
        featured: !!(meta && meta.featured),
        custom: cat.id === 'custom'
      }));
    });
    group.appendChild(list);
    root.appendChild(group);
  });

  applyPackageListFilter();
}

export function applyPackageListFilter() {
  const search = currentPkgSearch.toLowerCase();
  document.querySelectorAll('#pkg-catalog .pkg-list-item').forEach((item) => {
    const pkg = (item.getAttribute('data-pkg') || '').toLowerCase();
    const status = item.getAttribute('data-status') || 'available';
    const matchesSearch = !search || pkg.includes(search);
    let matchesStatus = true;
    if (status === 'loading') {
      matchesStatus = true;
    } else if (currentPkgFilter === 'loaded') {
      matchesStatus = status === 'loaded';
    } else if (currentPkgFilter === 'installed') {
      matchesStatus = status === 'installed';
    } else if (currentPkgFilter === 'available') {
      matchesStatus = status === 'available';
    }
    item.style.display = matchesSearch && matchesStatus ? 'flex' : 'none';
  });

  document.querySelectorAll('#pkg-catalog .pkg-category-group').forEach((group) => {
    const visible = Array.from(group.querySelectorAll('.pkg-list-item'))
      .some((el) => el.style.display !== 'none');
    group.style.display = visible ? 'block' : 'none';
  });
}

export async function updatePackageStatuses() {
  const webR = deps.getWebR && deps.getWebR();
  if (webR) {
    try {
      const res = await webR.evalR(`
        local({
          ip <- installed.packages()
          pri <- ip[, "Priority"]
          all_inst <- as.character(rownames(ip))
          user_inst <- all_inst[is.na(pri) | !(pri %in% c("base", "recommended"))]
          list(
            installed = user_inst,
            loaded = as.character(loadedNamespaces()),
            attached = as.character(.packages())
          )
        })
      `);
      const data = deps.unpackWebRJs(await res.toJs());
      lastInstalledSet = new Set(toNameArray(data && data.installed));
      lastLoadedSet = new Set(toNameArray(data && data.loaded));
      extraInstalled = mergePackageLists(
        catalogNames(),
        Array.from(lastInstalledSet),
        Array.from(pending.keys())
      );
    } catch (e) {
      console.warn('Erro ao atualizar status dos pacotes:', e);
    }
  }

  renderCatalog();
}

function normalizePkgName(raw) {
  return String(raw || '').trim();
}

export async function handlePackageAction(pkgName, action) {
  const webR = deps.getWebR && deps.getWebR();
  const name = normalizePkgName(pkgName);
  if (!webR || !name) return;
  if (!PKG_NAME_RE.test(name)) {
    deps.showToast(`Nome de pacote inválido: ${name}`, 'error');
    return;
  }

  const act = action === 'load' ? 'load' : 'install';
  pending.set(name, act);
  if (act === 'install' && !catalogNames().includes(name)) {
    extraInstalled = mergePackageLists(catalogNames(), extraInstalled, [name]);
  }
  renderCatalog();

  if (act === 'load') {
    deps.showToast(`Carregando library(${name})...`);
    deps.appendConsoleLine(`> library(${name})`, 'input');
    try {
      await webR.evalRVoid(`library(${name})`);
      pending.delete(name);
      deps.showToast(`Pacote ${name} carregado com sucesso!`);
      deps.appendConsoleLine(`✓ Pacote ${name} carregado e ativo na sessão.`, 'system');
      if (typeof deps.updateEnvironment === 'function') deps.updateEnvironment();
      await updatePackageStatuses();
    } catch (err) {
      pending.delete(name);
      deps.showToast(`Falha ao carregar ${name}`, 'error');
      deps.appendConsoleLine(`Erro ao carregar ${name}: ${err.message}`, 'stderr');
      renderCatalog();
    }
    return;
  }

  deps.showToast(`Iniciando instalação de ${name}...`);
  deps.appendConsoleLine(`> webr::install("${name}")`, 'input');
  try {
    await webR.evalRVoid(`webr::install("${name}")`);
    pending.delete(name);
    deps.showToast(`Pacote ${name} instalado com sucesso!`);
    deps.appendConsoleLine(
      `✓ Pacote ${name} instalado com sucesso. Use library(${name}) para carregar.`,
      'system'
    );
    await updatePackageStatuses();
  } catch (err) {
    pending.delete(name);
    deps.showToast(`Falha ao instalar ${name}`, 'error');
    deps.appendConsoleLine(`Erro ao instalar ${name}: ${err.message}`, 'stderr');
    await updatePackageStatuses();
  }
}

function bindUi() {
  if (uiBound) return;
  uiBound = true;

  const installBtn = document.getElementById('btn-install-pkg');
  const pkgInput = document.getElementById('pkg-input');
  const installNow = () => {
    if (!pkgInput || !pkgInput.value) return;
    handlePackageAction(pkgInput.value, 'install');
    pkgInput.value = '';
  };
  if (installBtn) installBtn.addEventListener('click', installNow);
  if (pkgInput) {
    pkgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        installNow();
      }
    });
  }

  document.getElementById('btn-refresh-packages')?.addEventListener('click', () => {
    updatePackageStatuses();
    deps.showToast('Status dos pacotes atualizado!');
  });

  const pkgSearchInp = document.getElementById('pkg-search-input');
  const pkgClearSearch = document.getElementById('btn-clear-pkg-search');
  if (pkgSearchInp) {
    pkgSearchInp.addEventListener('input', (e) => {
      currentPkgSearch = e.target.value.trim();
      if (pkgClearSearch) pkgClearSearch.style.display = currentPkgSearch ? 'block' : 'none';
      applyPackageListFilter();
    });
  }
  if (pkgClearSearch) {
    pkgClearSearch.addEventListener('click', () => {
      if (pkgSearchInp) pkgSearchInp.value = '';
      currentPkgSearch = '';
      pkgClearSearch.style.display = 'none';
      applyPackageListFilter();
    });
  }

  document.querySelectorAll('[data-pkg-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-pkg-filter]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentPkgFilter = btn.getAttribute('data-pkg-filter') || 'all';
      applyPackageListFilter();
    });
  });

  const catalog = document.getElementById('pkg-catalog');
  if (catalog) {
    catalog.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-quick-pkg');
      if (!btn || btn.disabled) return;
      const pkg = btn.getAttribute('data-pkg');
      const act = btn.getAttribute('data-action') || 'install';
      handlePackageAction(pkg, act);
    });
  }
}

export function initWebr2Packages(options = {}) {
  deps = { ...deps, ...options };
  bindUi();
  renderCatalog();
}

export const WEBR2_POPULAR_PACKAGES = POPULAR_PACKAGES;
