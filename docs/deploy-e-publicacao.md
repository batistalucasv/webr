# 🚀 Guia de Deploy & Publicação — RStation Web

Este documento descreve as instruções para publicar e hospedar o **RStation Web** em produção, com foco especial no **GitHub Pages**, **GitHub Actions**, configurações do **Quarto** e otimizações de segurança para WebAssembly.

---

## 🌐 1. Publicação no GitHub Pages

O RStation Web é 100% estático no cliente e está pronto para publicação imediata e gratuita no **GitHub Pages**.

### Método A: Deploy Direto da Branch Principal (Mais Simples)

1. Crie um repositório no GitHub (ex: `https://github.com/SEU_USUARIO/webr`).
2. Envie os arquivos do projeto para a branch `main`:
   ```bash
   git init
   git add .
   git commit -m "feat: publicar estacao webr no github pages"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/webr.git
   git push -u origin main
   ```
3. No GitHub, abra **Settings** > **Pages**.
4. Em **Build and deployment** > **Source**, selecione **Deploy from a branch**.
5. Escolha a branch `main` e a pasta `/ (root)`.
6. Clique em **Save**. O site estará disponível em:
   `https://SEU_USUARIO.github.io/webr/`

---

### Método B: Deploy Automatizado via GitHub Actions (com Quarto)

Se você utiliza o código-fonte Quarto em [`src/`](file:///src/), configure o workflow em [`.github/workflows/deploy.yml`](file:///src/.github/workflows/publish.yml):

```yaml
name: Render and Publish RStation Web

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Quarto
        uses: quarto-dev/quarto-actions/setup@v2

      - name: Render and Publish
        uses: quarto-dev/quarto-actions/publish@v2
        with:
          target: gh-pages
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 📄 2. Arquivos Essenciais para o Deploy

### 2.1. O Arquivo `.nojekyll`
- O arquivo `.nojekyll` na raiz do projeto é **obrigatório** no GitHub Pages.
- **Motivo:** O GitHub Pages executa o Jekyll por padrão, o que ignora qualquer arquivo ou diretório iniciado por underline (como `_extensions/`, `_quarto.yml`, etc.). O `.nojekyll` desativa o Jekyll e permite que todos os arquivos estáticos sejam servidos.

### 2.2. Arquivos de Metadados e SEO
- **`robots.txt`:** Controla a indexação dos mecanismos de busca.
- **`llms.txt`:** Facilita a descoberta e indexação por assistentes de IA.
- **`brand/favicon.svg`:** Ícone e branding oficial exibidos nas abas dos navegadores.

---

## 🔒 3. Isolamento de Origem Cruzada (COOP / COEP)

Para máxima performance com WebAssembly multithreading via `SharedArrayBuffer`, os seguintes cabeçalhos HTTP podem ser configurados no servidor de hospedagem (caso use Cloudflare Pages, Netlify ou Vercel):

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

> [!NOTE]
> No GitHub Pages padrão, o webR utiliza automaticamente o canal de comunicação baseado em **PostMessage** com compatibilidade universal caso o `SharedArrayBuffer` não esteja isolado.

---

## 🏷️ 4. Configuração de Domínio Personalizado (Custom Domain)

Para associar um domínio próprio (ex: `rstation.meudominio.com`):
1. No repositório, crie um arquivo chamado `CNAME` contendo apenas o seu domínio.
2. Nas configurações de DNS do seu provedor de domínio, aponte um registro CNAME para `SEU_USUARIO.github.io`.
3. No painel do GitHub (**Settings** > **Pages**), insira o domínio personalizado e marque a opção **Enforce HTTPS**.
