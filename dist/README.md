# webR — Estação de Análise no Navegador (GitHub Pages)

Este repositório contém a versão independente (standalone) da estação **webR** , pronta para ser publicada no **GitHub Pages**.

---

## 🚀 Como publicar no GitHub Pages em 3 passos:

### Passo 1: Criar um novo repositório no GitHub
1. Acesse [github.com/new](https://github.com/new).
2. Dê um nome ao repositório (por exemplo: `webr-station` ou `webr`).
3. Deixe o repositório como **Público** (Public).
4. Clique em **Create repository**.

### Passo 2: Subir os arquivos desta pasta
Você pode subir via Git pelo terminal:

```bash
git init
git add .
git commit -m "feat: inicializar estacao webr para github pages"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git push -u origin main
```

*(Ou simplesmente arrastar e soltar todos os arquivos e pastas desta pasta no GitHub web)*.

### Passo 3: Ativar o GitHub Pages
1. No seu repositório no GitHub, vá em **Settings** > **Pages** (no menu lateral esquerdo).
2. Em **Build and deployment** > **Source**, selecione **Deploy from a branch**.
3. Em **Branch**, selecione `main` e a pasta `/ (root)`.
4. Clique em **Save**.
5. Aguarde cerca de 1 a 2 minutos. Seu link estará no ar em:
   `https://SEU_USUARIO.github.io/NOME_DO_REPO/`

---

## 📁 Estrutura de Arquivos

- `index.html`: Página principal com o console webR, editor Monaco e área de upload.
- `styles.css`: Estilos visuais e temas claro/escuro.
- `config/webr-workstation.js`: Gerenciador de upload de dados e filesystem do webR.
- `config/ui-nav.js`: Suporte de navegação e layout.
- `site_libs/`: Bibliotecas do Quarto, Bootstrap, ícones e syntax highlighting.
- `brand/`: Favicon e identidade visual.
- `.nojekyll`: Arquivo essencial que impede o GitHub Pages de ignorar pastas de scripts.


---

## 👤 Autoria & Idealização

- **Idealização e Desenvolvimento:** **Lucas Batista Vargas** ([GitHub @batistalucasv](https://github.com/batistalucasv))
- **Compilado e Estruturado em:** **Antigravity**
