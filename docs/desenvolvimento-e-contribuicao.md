# 💻 Guia de Desenvolvimento & Contribuição — RStation Web

Este documento orienta desenvolvedores e pesquisadores interessados em contribuir para o projeto **RStation Web**, executar o ambiente de desenvolvimento localmente, rodar testes e estender as funcionalidades da estação.

---

## 🛠️ 1. Pré-requisitos do Ambiente

- **Node.js:** Versão 18.0.0 ou superior (recomendado 20+ ou 22+).
- **Navegador Moderno:** Chrome, Chromium, Firefox, Edge, Safari ou Brave com suporte a WebAssembly e ES Modules.
- **Quarto CLI (Opcional):** Apenas se você for editar e recompilar os arquivos fonte em [`src/`](file:///src/).

---

## 🚀 2. Como Rodar o Projeto Localmente

O RStation Web é composto por arquivos estáticos de alta performance (HTML, CSS e JavaScript) e pode ser servido por qualquer servidor HTTP local:

### 2.1. Usando npm / Node.js (Recomendado):
No diretório raiz do projeto:

```bash
npm run dev
# ou
npx serve . -p 3000
```
Abra no navegador em: `http://localhost:3000`

### 2.2. Usando Python:
```bash
python -m http.server 3000
```
Abra no navegador em: `http://localhost:3000`

### 2.3. Usando Quarto (para editar o código fonte em `src/`):
```bash
cd src
quarto preview index.qmd
```

---

## 🧪 3. Executando a Suíte de Testes Automatizados

O projeto utiliza o executor de testes nativo do Node.js (`node:test` e `node:assert`), garantindo testes rápidos sem a necessidade de instalar ferramentas pesadas de terceiros.

Para rodar todos os testes unitários:

```bash
node --test tests/plot-style.test.mjs tests/unpack-webr-js.test.mjs
```

### O que é testado:
- **`tests/plot-style.test.mjs`:** Validação completa das funções de parsing de código R (detecção de tipo de gráfico, extração de parâmetros `col`, `pch`, `lty`, substituição de argumentos, geração de blocos `scale_colour_manual` e splicing não-destrutivo).
- **`tests/unpack-webr-js.test.mjs`:** Garantia de integridade do desempacotamento de árvores de objetos do webR para objetos e arrays JavaScript nativos.

---

## 📐 4. Padrões de Código e Convenções

### 4.1. Estrutura Modular
- Módulos de lógica geral residem em [`config/`](file:///config/).
- Para módulos utilitários e controladores de UI, utilize o padrão **IIFE** para não poluir o escopo global:
  ```javascript
  (function () {
    // Escopo isolado
    window.meuModulo = {
      init: function () { ... }
    };
  })();
  ```
- Para módulos de lógica pura testáveis (como `webr-plot-style.js`), utilize **ES Modules** com `export` de funções puras.

### 4.2. Sistema de Design e Variáveis CSS
Todos os estilos devem consumir os tokens e variáveis do tema definidos em `styles.css`:
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--accent-blue`, `--accent-blue-hover`, `--border-color`
- Suporte a tema claro e escuro é controlado pelo atributo `data-theme="dark"` / `data-theme="light"` no elemento `<html>`.

### 4.3. Internacionalização (i18n)
- O idioma padrão da interface é **Português do Brasil (`pt-BR`)**.
- Mensagens e textos devem ser preparados para internacionalização usando o padrão estabelecido no `webr-about.js` (`webr2-lang` no `localStorage`).

---

## ➕ 5. Como Adicionar Novas Funcionalidades

### 5.1. Adicionar Novos Snippets ou Categorias de Cheatsheet
Abra o arquivo [`config/webr-productivity.js`](file:///config/webr-productivity.js) e adicione o novo bloco no objeto `SNIPPETS`:

```javascript
minhaCategoria: {
  label: "Minha Categoria",
  icon: "bi-stars",
  items: [
    {
      title: "Título do Snippet",
      code: `# Código R pronto e comentado\nlibrary(meuPacote)\ndata(meusDados)\n`
    }
  ]
}
```

### 5.2. Adicionar Novos Pacotes ao Catálogo Recomendado
Abra o arquivo [`config/webr-packages.js`](file:///config/webr-packages.js) e insira o pacote no array `POPULAR_PACKAGES`:

```javascript
{ name: 'meu_pacote', category: 'stats' }
```
As categorias disponíveis são: `'core'`, `'plots'`, `'stats'`, `'bio'`, `'tables'`.

---

## 📝 6. Fluxo de Git e Commits

Recomenda-se o padrão de **Conventional Commits**:
- `feat: adiciona novo visualizador de matrizes no data grid`
- `fix: corrige deteccao de separador no assistente CSV`
- `docs: atualiza guia de arquitetura com novo diagrama`
- `test: adiciona testes unitarios para exportador SVG`
- `refactor: modulariza controladores da barra de navegacao`
