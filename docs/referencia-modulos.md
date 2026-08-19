# 🔌 Referência de Módulos & APIs — RStation Web

Esta seção descreve a arquitetura detalhada, contratos de interface, funções e variáveis globais dos módulos JavaScript localizados no diretório [`config/`](file:///config/).

---

## 📁 1. Mapa de Módulos

```text
config/
├── webr-workstation.js    # Inicialização da engine webR, VFS e eventos centrais
├── ui-nav.js              # Gerenciador de abas de ferramentas e navegação da UI
├── webr-header.js         # Barra de menus (Menubar) e atalhos rápidos
├── webr-analysis.js       # Assistente CSV, Skim e Data Grid interativo
├── webr-plot-style.js     # Motor AST/Regex de inspeção e estilo de gráficos
├── webr-packages.js       # Catálogo, status e instalador de pacotes WASM
├── webr-productivity.js   # Paleta de comandos (Ctrl+K) e gaveta de Snippets
├── webr-session.js        # Multi-scripts, Share por URL, Sessão e Relatórios
├── webr-unpack.js         # Conversor e desempacotador de estruturas R para JS
└── webr-about.js          # Modal de Sobre, versão e histórico de alterações
```

---

## 🛠️ 2. Especificação Detalhada dos Módulos

### 2.1. `webr-unpack.js` (Desempacotador de Objetos R)
Exporta a função pura `unpackWebRJs(v)` para sanitizar saídas do webR.

#### Funções Exportadas:
- `unpackWebRJs(raw)`:
  - **Entrada:** Árvore de objetos retornada por `(await rObject).toJs()`.
  - **Saída:** Objeto / Array JavaScript limpo.
  - **Tratamento especial:**
    - Converte tipos `list` e `data.frame` com `names` e `values` em pares chave-valor legíveis.
    - Preserva vetores atômicos de comprimento 1 como arrays quando pertencem a colunas de DataFrame.
    - Converte `NA` do R em `null` do JavaScript.
    - Extrai mensagens de erro via `rScalar` quando o payload indica falha na execução.

---

### 2.2. `webr-plot-style.js` (Engine de Estilização de Gráficos)
Módulo estruturado com exportações ES Module, totalmente coberto por testes unitários (`tests/plot-style.test.mjs`).

#### Constantes e Enums:
- `STYLE_BEGIN`: `'# --- webr-plot-style ---'`
- `STYLE_END`: `'# --- /webr-plot-style ---'`
- `LEGEND_POSITIONS_GGPLOT`: `['none', 'top', 'bottom', 'left', 'right']`
- `LEGEND_POSITIONS_BASE`: `['topleft', 'topright', 'bottomleft', 'bottomright', 'top', 'bottom', 'left', 'right', 'center']`
- `PCH_CHOICES`: Array de números `[0, 1, 2, ..., 25]` correspondentes aos símbolos de ponto no R.
- `LTY_CHOICES`: Array de objetos `{ value: 'solid' | 'dashed' | ..., label: '...' }`.

#### Principais Funções:
- `detectPlotKind(scriptText)`: Retorna `'ggplot'`, `'base'` ou `'none'` analisando o código-fonte R.
- `inspectBaseFromSource(scriptText)`: Extrai cores (`col`), símbolos (`pch`), tipos de linha (`lty`), espessuras (`lwd`), tamanho de fonte (`cex`), títulos e posições de legenda de chamadas Base R.
- `extractEqualsCall(scriptText, paramName)`: Identifica e extrai chamadas como `col = c(...)` ou `pch = 19`.
- `patchEqualsCall(scriptText, paramName, replacement)`: Substitui o argumento alvo no código R de forma não-destrutiva.
- `generateGgplotAddon(options)`: Gera a cadeia de código `scale_*_manual()` e `theme()` para ggplot2.
- `spliceGgplotStyle(scriptText, addonCode)`: Insere ou substitui o bloco gerenciado `# --- webr-plot-style ---` no final da cadeia `ggplot()` correspondente.
- `applyPlotStyle(scriptText, config)`: Ponto de entrada unificado que aplica estilizações em scripts ggplot2 ou Base R.

---

### 2.3. `webr-analysis.js` (Assistente de CSV, Skim e Data Grid)
Exposto no escopo global como `window.webrAnalysis`.

#### Métodos Públicos:
- `init(dependencies)`: Injeta referências para `getWebR`, `getEditor`, `showToast` e `updateEnvironment`.
- `openCsvWizard(file)`: Abre o modal de configuração de importação para o arquivo carregado.
- `detectEncoding(arrayBuffer)`: Analisa os bytes e pontua a presença de caracteres corrompidos (`\uFFFD`) para escolher entre `UTF-8` e `Windows-1252`.
- `detectSep(textSample)`: Avalia consistência de contagem de colunas para `,`, `;`, `\t` e `|` nas primeiras 10 linhas e retorna o separador de maior pontuação.
- `renderPreviewTable(rows, container)`: Renderiza tabela HTML dinâmica com amostra dos dados.
- `loadCsvToR(config)`: Monta o comando R (`read.csv` / `read.csv2` / `readr::read_delim`) com os parâmetros selecionados, grava o arquivo no VFS e executa o código.

---

### 2.4. `webr-session.js` (Gestão de Multi-Scripts, Sessão e Relatórios)
Exposto no escopo global como `window.webrSession`.

#### Métodos Públicos:
- `init(dependencies)`: Inicializa as abas de scripts com suporte ao Monaco Editor.
- `createNewTab(optionalName, optionalContent)`: Cria uma nova aba de script e associa um `monaco.editor.ITextModel`.
- `switchTab(tabId)`: Altera a aba ativa e atualiza o modelo exibido no Monaco Editor.
- `closeTab(tabId)`: Fecha a aba especificada (garantindo que pelo menos uma aba permaneça aberta).
- `renameTab(tabId, newName)`: Sanitiza e atualiza o nome do script (ex: `analise_v2.R`).
- `exportAllScriptsZip()`: Compacta todos os scripts abertos e dispara o download de um arquivo `.zip`.
- `generateShareUrl()`: Serializa o conteúdo dos scripts abertos, comprime usando LZ-String e gera a URL com hash `#code=...`.
- `saveSessionFile()`: Exporta o arquivo de projeto `.webr-project.json`.
- `loadSessionFile(file)`: Lê um arquivo de sessão, restaura todos os scripts e modelos e ativa a primeira aba.
- `exportReport(format, options)`: Compila scripts, gráficos do canvas e saídas de console em um documento HTML formatado para impressão ou exportação em PDF.

---

### 2.5. `webr-productivity.js` (Snippets e Paleta de Comandos)
Exposto no escopo global como `window.webrProductivity`.

#### Estrutura do Registro de Snippets (`SNIPPETS`):
```javascript
{
  tidyverse: { label: "Tidyverse", icon: "bi-funnel-fill", items: [...] },
  estatistica: { label: "Estatística", icon: "bi-calculator-fill", items: [...] },
  modelagem: { label: "Modelagem", icon: "bi-graph-up-arrow", items: [...] },
  ggplot2: { label: "ggplot2", icon: "bi-palette-fill", items: [...] },
  bioecologia: { label: "Bio / Ecologia", icon: "bi-tree-fill", items: [...] }
}
```

#### Métodos Públicos:
- `init(dependencies)`: Registra atalhos globais de teclado (<kbd>Ctrl+K</kbd>, <kbd>Cmd+K</kbd>, <kbd>Escape</kbd>) e monta a gaveta lateral.
- `openPalette()`: Exibe a paleta de comandos central com foco no campo de busca.
- `closePalette()`: Fecha a paleta de comandos.
- `openSnippetsDrawer()`: Abre a gaveta lateral de receitas de código.
- `insertSnippet(code)`: Insere o bloco de código selecionado na posição atual do cursor no Monaco Editor.

---

### 2.6. `webr-packages.js` (Catálogo e Gestor de Pacotes)
Exposto no escopo global como `window.webrPackages`.

#### Constantes:
- `SYSTEM_PACKAGES`: Conjunto de pacotes nativos do sistema (`base`, `stats`, `graphics`, `utils`, `webr`, etc.).
- `CATEGORIES`: Categorias de catálogo (`core`, `plots`, `stats`, `bio`, `tables`, `custom`).
- `POPULAR_PACKAGES`: Catálogo curado de pacotes recomendados para instalação no webR.

#### Métodos Públicos:
- `init(dependencies)`: Conecta o catálogo à UI da aba Pacotes.
- `installPackage(packageName)`: Executa `webr::install("nome")` no R, atualizando os badges de status para *Carregando...*, *Instalado* ou *Erro*.
- `refreshPackageStatus()`: Consulta `installed.packages()` e `.packages()` no R para sincronizar o status em tempo real.

---

### 2.7. `webr-header.js` e `webr-about.js`
- `window.webrHeader.init()`: Vincula os menus estáticos suspensos (*Dropdowns*) da Menubar, gerencia o posicionamento responsivo e mapeia cliques para ações internas da estação.
- `window.webrAbout.init()`: Injeta a opção "Sobre" na Menubar e exibe o modal com número de versão (`0.1.0 beta`), créditos e histórico de alterações (*Changelog*).
