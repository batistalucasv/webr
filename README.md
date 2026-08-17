# 🌐 webR Station — Estação de Análise R no Navegador

Repositório independente com uma estação de análise interativa baseada em **webR (WebAssembly)**, **Monaco Editor** e sistema de **upload drag-and-drop de arquivos para o filesystem do R**.

---

## ⚡ Características

- **Zero Instalação:** O R roda 100% no navegador do usuário via WebAssembly (WASM).
- **Upload de Arquivos:** Área de arrastar e soltar (drag-and-drop) para enviar arquivos (`.csv`, `.txt`, `.xlsx`, etc.) diretamente para `/home/web_user/uploads/` no webR.
- **Editor Monaco:** Editor de código completo com syntax highlighting, atalhos do RStudio (`Ctrl+Enter` para rodar seleção/linha) e autocompletion.
- **Tema Claro / Escuro:** Alternância de tema integrada e persistente.
- **GitHub Pages Ready:** Pronto para publicação direta no GitHub Pages com GitHub Actions ou deploy de branch estática.

---

## 🚀 Como Iniciar um Novo Repositório no GitHub

### 1. Criar o repositório no GitHub
1. Acesse [github.com/new](https://github.com/new).
2. Nomeie o repositório (ex: `webr` ou `webr-station`).
3. Deixe como **Público** (Public) e clique em **Create repository**.

### 2. Inicializar o Git e Enviar
No terminal dentro desta pasta (`webr-station`):

```bash
git init
git add .
git commit -m "feat: inicializar estacao webr para github pages"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git push -u origin main
```

### 3. Ativar o GitHub Pages
1. No seu repositório no GitHub, abra **Settings** > **Pages**.
2. Em **Build and deployment** > **Source**, selecione **GitHub Actions** (ou *Deploy from a branch* -> `main` / `root`).
3. O deploy será feito automaticamente em segundos!
4. O link final será: `https://SEU_USUARIO.github.io/NOME_DO_REPO/`

---

## 💻 Testar e Rodar Localmente

Você pode servir a pasta estática localmente usando qualquer servidor HTTP simples:

### Usando Node.js / npx:
```bash
npm run dev
# ou
npx serve . -p 3000
```
Depois abra no navegador: `http://localhost:3000`

### Usando Python:
```bash
python -m http.server 3000
```

### Usando Quarto (para editar o código fonte em `src/`):
```bash
cd src
quarto preview index.qmd
```

---

## 📁 Estrutura do Repositório

```text
webr-station/
├── index.html                 # Página estática principal pronta para produção
├── styles.css                 # Estilos da interface e dos temas claro/escuro
├── .nojekyll                  # Garante carregamento correto no GitHub Pages
├── package.json               # Scripts de desenvolvimento local
├── config/
│   ├── webr-workstation.js    # Gerenciador de upload e integração com o webR
│   └── ui-nav.js              # Helpers de interface e navegação
├── site_libs/                 # Bibliotecas (Bootstrap, Quarto, syntax highlight)
├── brand/                     # Favicons, logos e ícones
├── src/                       # Código-fonte Quarto (caso queira recompilar)
│   ├── index.qmd              # Documento Quarto fonte
│   ├── _quarto.yml            # Configuração do Quarto
│   └── _extensions/coatless/  # Extensão Quarto webR
└── .github/
    └── workflows/
        └── deploy.yml         # GitHub Actions para deploy contínuo no GitHub Pages
```

---

## 🛠️ Como pré-instalar pacotes R

Se quiser que o webR já inicialize instalando pacotes R adicionais automaticamente (por exemplo `ggplot2`, `dplyr`, `vegan`), você pode:

1. No arquivo [`src/index.qmd`](file:///src/index.qmd) (ou no `_quarto.yml`):
   ```yaml
   webr:
     packages: ['ggplot2', 'dplyr']
   ```
2. Ou via código R direto no console:
   ```r
   webr::install("ggplot2")
   library(ggplot2)
   ```

---


---

## 🙏 Créditos e Agradecimentos

Este projeto é desenvolvido com base em tecnologias e extensões de código aberto incríveis:

- **[webR](https://docs.r-wasm.org/webr/latest/)** — Criado por **George Stagg** e mantido pela equipe da **Posit PBC** ([GitHub r-wasm/webr](https://github.com/r-wasm/webr)). Trata-se da versão oficial do interpretador R compilado para WebAssembly (WASM), permitindo executar código R inteiramente no navegador do usuário sem depender de servidor remoto.
- **[quarto-webr](https://github.com/coatless/quarto-webr)** — Desenvolvido por **James Joseph Balamuta (coatless)** ([GitHub coatless/quarto-webr](https://github.com/coatless/quarto-webr)). Extensão que integra o webR ao ecossistema Quarto e Monaco Editor.
- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** — O editor de código open source desenvolvido pela **Microsoft** que alimenta o VS Code.
- **[Quarto](https://quarto.org/)** — Sistema de publicação técnica e científica de código aberto da **Posit PBC**.

## 📄 Licença
Distribuído sob a licença MIT.
