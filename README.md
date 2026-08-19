# 🌐 RStation Web — Estação Científica de Análise R no Navegador

<div align="center">

![RStation Web Logo](./brand/favicon.svg)

**Ambiente integrado de desenvolvimento, análise de dados e visualização científica em R, executando 100% no navegador via WebAssembly (webR).**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![webR](https://img.shields.io/badge/webR-0.5.7-blue?logo=r&logoColor=white)](https://docs.r-wasm.org/webr/latest/)
[![Monaco Editor](https://img.shields.io/badge/Monaco_Editor-0.47.0-blueviolet?logo=visualstudiocode)](https://microsoft.github.io/monaco-editor/)
[![Tests](https://img.shields.io/badge/tests-28%20passing-brightgreen)](#-testes-automatizados)
[![GitHub Pages](https://img.shields.io/badge/deployment-GitHub_Pages-success?logo=github)](https://pages.github.com/)

[**Acessar Demonstração**](https://batistalucasv.github.io/webr/) · [**Guia do Usuário**](./docs/guia-do-usuario.md) · [**Arquitetura**](./docs/arquitetura.md) · [**Central de Documentação**](./docs/README.md)

</div>

---

## ⚡ Principais Recursos

- **Zero Instalação & Zero Servidor:** Executa o interpretador oficial GNU R inteiramente no navegador via WebAssembly (`webR`), sem necessidade de backend remoto ou instalação local.
- **Editor Monaco Integrado:** Motor de edição de código do VS Code com suporte a syntax highlighting para R, auto-complete, atalhos do RStudio (`Ctrl+Enter`, `Shift+Enter`) e editor multi-abas (`script1.R`, `analise.R`) com download individual ou em pacote `.zip`.
- **Assistente Inteligente de Dados:** Upload por arrastar e soltar (drag & drop), detecção automática de encoding (`UTF-8` vs `Windows-1252`), delimitador (`,`, `;`, `\t`, `|`) e geração instantânea de código de leitura R.
- **Conexão Direta em Nuvem:** Importação imediata de links públicos do Google Sheets, repositórios raw do GitHub e planilhas Excel multi-abas (`.xlsx`) com preview de dados.
- **Visualizador de Dados (Data Grid Interativo):** Navegação dinâmica em DataFrames com ordenação, busca por coluna, paginação rápida, diagnóstico de valores ausentes (`NA`), conversor de tipos de dados e exportação para CSV/Excel.
- **Galeria & Editor Visual de Estilo de Gráficos:** Captura de saídas gráficas em alta resolução (até 600 DPI / SVG vetorial), histórico com carrossel de miniaturas (*filmstrip*) e edição visual interativa de cores, símbolos (`pch`), tipos de linha (`lty`), legendas e fontes com sincronização bidirecional de código no editor R.
- **Produtividade & Snippets:** Paleta de comandos rápidos (<kbd>Ctrl</kbd>+<kbd>K</kbd>) e gaveta de receitas prontas categorizadas (Tidyverse, Estatística, Modelagem `lm`/`glm`, ggplot2, Bioestatística e Ecologia).
- **Reprodutibilidade & Relatórios:** Compartilhamento de análises via URL compactada com algoritmo LZ-String (`#code=...`), salvamento de sessão completa (`.webr-project`) e exportador de relatórios estáticos em PDF e HTML.

---

## 📚 Documentação Completa

Para aprofundar-se em cada área do projeto, consulte a nossa suíte de documentação:

| Documento | Conteúdo |
| :--- | :--- |
| 📖 **[Central de Documentação](./docs/README.md)** | Índice geral e mapa estruturado de navegação. |
| 👤 **[Guia do Usuário](./docs/guia-do-usuario.md)** | Manual completo: interface, atalhos, importação, grid, gráficos e relatórios. |
| 🏗️ **[Guia de Arquitetura](./docs/arquitetura.md)** | Engenharia de software, WebAssembly, VFS Emscripten, pipeline de dados R-JS. |
| 🔌 **[Referência de Módulos & APIs](./docs/referencia-modulos.md)** | Especificação de módulos JavaScript (`webr-*.js`), métodos e contratos. |
| 💻 **[Desenvolvimento & Contribuição](./docs/desenvolvimento-e-contribuicao.md)** | Como rodar localmente, suíte de testes unitários e convenções de código. |
| 🚀 **[Deploy & Publicação](./docs/deploy-e-publicacao.md)** | Instruções para deploy no GitHub Pages, GitHub Actions e Quarto. |
| ❓ **[FAQ & Solução de Problemas](./docs/faq-e-solucao-de-problemas.md)** | Perguntas frequentes, CORS, diagnóstico de erros e limites de memória. |

---

## ⌨️ Atalhos Rápidos de Teclado

| Atalho | Ação |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Enter</kbd> / <kbd>Cmd</kbd> + <kbd>Enter</kbd> | Executa a **linha atual** ou o **bloco de código selecionado**. |
| <kbd>Shift</kbd> + <kbd>Enter</kbd> | Executa **todo o script** da aba ativa. |
| <kbd>Ctrl</kbd> + <kbd>L</kbd> | **Limpa a saída** do console R. |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Abre a **Paleta de Comandos Rápidos**. |
| <kbd>Alt</kbd> + <kbd>-</kbd> | Insere o operador de atribuição `<-`. |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd> | Insere o operador pipe nativo `\|>`. |

---

## 🚀 Como Executar Localmente

Você pode servir a pasta estática localmente com qualquer servidor HTTP simples:

### Usando Node.js / npm:
```bash
npm run dev
# ou
npx serve . -p 3000
```
Abra no navegador em: `http://localhost:3000`

### Usando Python:
```bash
python -m http.server 3000
```

### Usando Quarto (para recompilar os fontes em `src/`):
```bash
cd src
quarto preview index.qmd
```

---

## 🧪 Testes Automatizados

O projeto possui suíte de testes unitários nativa em Node.js (`node:test` e `node:assert`):

```bash
node --test tests/plot-style.test.mjs tests/unpack-webr-js.test.mjs
```

---

## 📁 Estrutura do Repositório

```text
webr/
├── index.html                 # Página principal da estação pronta para produção
├── webr2.html                 # Versão modular do RStation Web
├── styles.css                 # Estilos principais e tokens de design (Dark/Light)
├── styles-webr2.css           # Estilos complementares de componentes modulares
├── package.json               # Metadados e scripts de execução local
├── .nojekyll                  # Garante carregamento estático correto no GitHub Pages
├── docs/                      # Central completa de documentação técnica e de usuário
│   ├── README.md              # Hub central da documentação
│   ├── guia-do-usuario.md     # Manual completo de utilização
│   ├── arquitetura.md         # Arquitetura de software e motor WASM
│   ├── referencia-modulos.md  # Referência técnica de APIs e controladores JS
│   ├── desenvolvimento-e-contribuicao.md # Guia de desenvolvimento e testes
│   ├── deploy-e-publicacao.md # Guia de publicação e CI/CD
│   └── faq-e-solucao-de-problemas.md     # FAQ e diagnóstico de problemas
├── config/                    # Módulos controladores da estação
│   ├── webr-workstation.js    # Inicialização do webR, VFS e eventos da UI
│   ├── ui-nav.js              # Navegação entre abas de ferramentas
│   ├── webr-header.js         # Barra de menus suspensos e atalhos rápidos
│   ├── webr-analysis.js       # Assistente CSV, Skim e Data Grid interativo
│   ├── webr-plot-style.js     # Motor AST/Regex de estilo de gráficos (testado)
│   ├── webr-packages.js       # Catálogo e instalador de pacotes WASM
│   ├── webr-productivity.js   # Paleta Ctrl+K e gaveta de Snippets/Cheatsheets
│   ├── webr-session.js        # Multi-scripts, share por URL, sessão e relatórios
│   ├── webr-unpack.js         # Desempacotador de estruturas R para JS
│   └── webr-about.js          # Modal Sobre, versão e changelog
├── tests/                     # Testes automatizados (node:test)
│   ├── plot-style.test.mjs    # Testes unitários do motor de estilização gráfica
│   └── unpack-webr-js.test.mjs# Testes unitários do desempacotador de dados
├── brand/                     # Identidade visual, logos e favicons
└── src/                       # Código-fonte Quarto (caso deseje recompilar)
```

---

## 👤 Autoria & Modificações

- **Modificações de Interface, Layout & Documentação:** **Lucas Batista Vargas** ([GitHub @batistalucasv](https://github.com/batistalucasv))
- **Finalidade:** Projeto **Open Source**, 100% gratuito e livre, voltado exclusivamente para fins de **estudo, pesquisa e uso não comercial**.

---

## 🙏 Créditos ao Projeto Original e Tecnologias

Este projeto é uma customização de interface construída sobre projetos de código aberto fundamentais:

- **[webR Oficial (r-wasm)](https://webr.r-wasm.org)** — Criado por **George Stagg** e mantido pela equipe da **Posit PBC** ([GitHub r-wasm/webr](https://github.com/r-wasm/webr) / [Documentação webR](https://docs.r-wasm.org/webr/latest/)). O compilador e runtime oficial de R em WebAssembly (WASM).
- **[quarto-webr](https://github.com/coatless/quarto-webr)** — Desenvolvido por **James Joseph Balamuta (coatless)**. Extensão que viabilizou a integração do webR com Quarto e Monaco Editor.
- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** — O editor de código aberto desenvolvido pela **Microsoft**.
- **[Quarto](https://quarto.org/)** — Sistema de publicação científica e técnica de código aberto da **Posit PBC**.

---

## 📄 Licença

Distribuído sob a licença **MIT** (mesma licença do webR, Monaco Editor e quarto-webr), preservando todos os avisos de direitos autorais dos autores originais. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.

