# 👤 Guia do Usuário — RStation Web

O **RStation Web** é uma estação interativa de programação em R para o navegador. Este manual apresenta todos os recursos da interface e ensina passo a passo como importar dados, escrever e executar scripts, personalizar gráficos, instalar pacotes e compartilhar suas análises científicas.

---

## 🖥️ 1. Visão Geral da Interface

A interface do RStation Web foi desenhada para oferecer uma experiência de IDE completa, moderna e responsiva:

```text
+-------------------------------------------------------------------------------+
| [Logo] RStation Web  [Status WebR]  | Arquivo Código Executar Ver Compartilhar|
| [▶ Executar] [▶▶ Tudo] [🗑️ Limpar] | [☀️/🌙 Tema] [🐙 GitHub]                |
+----------------------------------------+--------------------------------------+
| [Abas de Script: script.R | analise.R] | [Abas: Console | Dados | Gráficos...]|
|                                        |                                      |
|            MONACO EDITOR               |            PAINEL DIREITO            |
|       (Editor de Código R com          |         (Console interativo,         |
|         Syntax Highlighting)           |        Data Grid, Galeria de         |
|                                        |       Gráficos, Pacotes, VFS)        |
|                                        |                                      |
+----------------------------------------+--------------------------------------+
|                                RODAPÉ                                         |
+-------------------------------------------------------------------------------+
```

### Componentes Principais:
1. **Barra de Menus (Menubar Superior):** Acesso estruturado a comandos de *Arquivo*, *Código*, *Executar*, *Ver*, *Compartilhar* e *Sobre*.
2. **Barra de Controle Rápido:**
   - **Status da Engine:** Indicador visual do status do webR (amarelo: carregando; verde: pronto; vermelho: erro).
   - **Botões de Execução:** *Executar* (`Ctrl+Enter`), *Tudo* (`Shift+Enter`) e *Limpar* (`Ctrl+L`).
   - **Alternador de Tema:** Alterna instantaneamente entre Modo Escuro (Dark) e Claro (Light), com persistência no navegador.
3. **Divisor Redimensionável (Split Pane):** Barra central entre o editor e o painel de ferramentas. Arraste horizontalmente para ajustar o espaço de cada lado. O layout escolhido é salvo automaticamente.
4. **Painel de Ferramentas com Abas:**
   - **Console:** Terminal interativo com logs de execução, saídas textuais e mensagens de erro do R.
   - **Dados:** Visualizador dinâmico de DataFrames (Data Grid) com filtros, paginação e estatísticas.
   - **Gráficos:** Histórico de plots gerados, editor visual de estilo e exportação em alta resolução.
   - **Arquivos:** Navegador de arquivos do sistema virtual do R (`/home/web_user/uploads/`).
   - **Ambiente:** Inspetor de objetos na memória da sessão R (`data.frames`, matrizes, vetores).
   - **Pacotes:** Catálogo e gerenciador de pacotes WebAssembly do R.

---

## ⌨️ 2. Execução de Código e Atalhos de Teclado

O editor é construído sobre o **Monaco Editor** (o mesmo motor do VS Code) e oferece atalhos compatíveis com o RStudio:

| Atalho | Ação |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Enter</kbd> / <kbd>Cmd</kbd> + <kbd>Enter</kbd> | Executa a **linha atual** ou o **bloco de código selecionado**. |
| <kbd>Shift</kbd> + <kbd>Enter</kbd> | Executa **todo o script** aberto na aba ativa. |
| <kbd>Ctrl</kbd> + <kbd>L</kbd> | **Limpa a tela do Console**. |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Abre a **Paleta de Comandos Rápidos**. |
| <kbd>Alt</kbd> + <kbd>-</kbd> (no editor) | Insere o operador de atribuição `<-`. |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd> | Insere o operador pipe nativo `\|>`. |

---

## 📑 3. Gestão de Scripts (Múltiplas Abas)

Você pode trabalhar em múltiplos scripts simultaneamente sem perder o estado da sua sessão:

- **Nova Aba:** Clique no botão `+` na barra superior do editor para criar uma nova aba (`script2.R`).
- **Renomear Aba:** Dê um **duplo clique** sobre o nome da aba ou clique no ícone de lápis (`✏️`). Digite o novo nome e pressione <kbd>Enter</kbd>.
- **Fechar Aba:** Clique no `×` da aba desejada. A última aba aberta nunca é fechada para garantir que o editor permaneça funcional.
- **Salvar Script Atual:** No menu *Arquivo > Salvar .R*, você faz o download do arquivo `.R` ativo.
- **Exportar Todos em ZIP:** O RStation permite exportar todo o conjunto de scripts abertos como um arquivo comprimido `.zip`.

---

## 📥 4. Importação de Dados

O RStation Web suporta quatro formas intuitivas de carregar dados para a sessão do R:

### 4.1. Upload Local por Arraste e Solte (Drag & Drop)
Arraste qualquer arquivo (`.csv`, `.txt`, `.tsv`, `.xlsx`, etc.) do seu computador e solte sobre a área de trabalho. O arquivo é gravado no sistema de arquivos virtual em `/home/web_user/uploads/`.

### 4.2. Assistente Inteligente de CSV (CSV Wizard)
Ao soltar ou carregar um arquivo `.csv` ou `.txt`, o assistente inteligente entra em ação:
1. **Detecção Automática de Encoding:** Identifica se o arquivo está em `UTF-8` ou `Windows-1252` (acentos em português/espanhol).
2. **Identificação de Separador:** Identifica automaticamente se os dados usam vírgula (`,`), ponto e vírgula (`;`), tabulação (`\t`) ou barra vertical (`|`).
3. **Ponto vs. Vírgula Decimal:** Configuração para ponto (`1.5`) ou vírgula (`1,5`).
4. **Preview Interativo:** Exibe as primeiras 8 linhas da tabela formatada antes do carregamento.
5. **Geração de Código no R:** Ao clicar em *Carregar no R*, o assistente injeta a chamada de leitura correta (`read.csv`, `read.csv2` ou `readr::read_delim`) e disponibiliza o dataset no ambiente.

### 4.3. Importador de Planilhas Excel (`.xlsx`)
Ao enviar um arquivo `.xlsx`, um modal permite:
- Escolher qual aba da planilha carregar via menu dropdown.
- Visualizar um preview das 5 primeiras linhas.
- Converter a aba selecionada em um `data.frame` no R.

### 4.4. Conexão e Importação Direta em Nuvem
No menu ou botão de importação em nuvem, você pode colar URLs públicas:
- **Google Sheets:** Cole a URL padrão do seu Google Planilhas. O sistema converte automaticamente o link para o endpoint de exportação CSV (`export?format=csv&gid=...`).
- **GitHub Raw:** Cole o link de um arquivo no GitHub. URLs `github.com/.../blob/...` são automaticamente convertidas para `raw.githubusercontent.com`.
- **APIs e URLs HTTP:** URLs de arquivos CSV públicos de qualquer servidor web com suporte a CORS.

---

## 📊 5. Visualizador de Dados Interativo (Data Grid)

Na aba **Dados**, você pode inspecionar DataFrames carregados na memória do R com recursos avançados:

1. **Seletor de DataFrame:** Escolha qualquer dataset disponível no ambiente (incluindo bases nativas como `iris`, `mtcars` e `airquality`).
2. **Busca Global e Filtros por Coluna:** Digite termos de busca gerais ou filtre colunas específicas.
3. **Ordenação Dinâmica:** Clique no cabeçalho de qualquer coluna para ordenar de forma ascendente ou descendente.
4. **Diagnóstico de Valores Ausentes (`NA`):** Veja a contagem e percentual de valores nulos/ausentes em cada coluna.
5. **Conversor de Tipos de Coluna:** Converta colunas para `numeric`, `character`, `factor`, `integer`, `logical` ou `Date` com recarregamento em tempo real.
6. **Exportação:** Baixe o subconjunto filtrado para `.csv` ou `.xlsx` diretamente do navegador.

---

## 📈 6. Gráficos, Galeria e Editor Visual de Estilo

Todas as funções gráficas do R (`plot()`, `hist()`, `boxplot()`, `ggplot()`, etc.) são capturadas pelo motor gráfico webR.

### 6.1. Histórico Visual (Filmstrip)
Abaixo do gráfico principal, um carrossel de miniaturas permite navegar entre todos os gráficos gerados durante a sessão sem precisar reexecutar o código.

### 6.2. Editor Visual de Estilo (Plot Style Editor)
Personalize a aparência dos seus gráficos interativamente na aba lateral:
- **Cores & Paletas:** Escolha cores individuais ou paletas para grupos categóricos.
- **Símbolos de Ponto (`pch`):** Altere entre círculos preenchidos (19), quadrados (15), triângulos (17), etc.
- **Tipos de Linha (`lty`):** Alterne entre sólida (`solid`), tracejada (`dashed`), pontilhada (`dotted`), etc.
- **Posição da Legenda:** Posicione a legenda no topo, base, esquerda, direita ou remova-a.
- **Títulos e Rótulos dos Eixos:** Altere o título principal, rótulo do eixo X e eixo Y.
- **Sincronização Bidirecional com o Código:** As alterações feitas visualmente são inseridas no código R no editor entre marcadores `# --- webr-plot-style ---`, garantindo 100% de reprodutibilidade.

### 6.3. Exportador de Figuras em Alta Resolução
Clique em **Exportar Gráfico** para abrir o modal de exportação:
- **Densidade de Resolução (DPI):**
  - `72 DPI`: Resolução de tela padrão.
  - `150 DPI`: Apresentações e relatórios web.
  - `300 DPI`: Padrão para publicação científica e teses.
  - `600 DPI`: Impressão gráfica ultra-nítida.
- **Formatos:** PNG (com fundo transparente ou branco) e SVG (vetorial escalável).
- **Dimensões Customizadas:** Defina largura e altura em pixels (`px`) ou centímetros (`cm`).

---

## 📦 7. Gestão de Pacotes R (WASM)

Na aba **Pacotes**, você gerencia os pacotes R compilados para WebAssembly:

- **Instalação Rápida:** Digite o nome do pacote (ex: `ggplot2`, `dplyr`, `vegan`, `agricolae`) e clique em **Instalar**. O download e a instalação ocorrem em segundo plano.
- **Catálogo Categorizado:** Navegue por pacotes recomendados em categorias:
  - *Ecossistema Completo:* `tidyverse`
  - *Gráficos:* `patchwork`, `ggrepel`, `scales`, `viridis`, `ggpubr`
  - *Estatística:* `broom`, `car`, `emmeans`, `corrplot`
  - *Bio / Ecologia / Agro:* `vegan`, `agricolae`, `ape`
  - *Tabelas & Relatórios:* `knitr`, `skimr`
- **Status dos Pacotes:** Indicadores visuais de *Não instalado*, *Instalando...*, *Instalado* e *Ativo (library carregada)*.

---

## ⚡ 8. Snippets, Cheatsheets e Paleta de Comandos

### Paleta de Comandos (<kbd>Ctrl</kbd> + <kbd>K</kbd>)
Pressione <kbd>Ctrl</kbd>+<kbd>K</kbd> a qualquer momento para abrir o menu de busca rápida. Permite alternar abas, executar blocos, limpar consoles, carregar exemplos e mudar temas sem usar o mouse.

### Gaveta de Snippets & Cheatsheets
Acesse pelo menu *Código > Snippets* para inserir blocos de código prontos e testados:
- **Tidyverse:** Filtros, agrupamentos com `summarise`, transposição com `pivot_longer` e manipulação de strings.
- **Estatística:** Teste t de Student, ANOVA one-way, Teste de Mann-Whitney e Qui-quadrado.
- **Modelagem:** Regressão linear simples e múltipla (`lm`), modelos lineares generalizados (`glm`) e gráficos de diagnóstico de resíduos.
- **ggplot2:** Gráficos de dispersão com curva de regressão, boxplots com pontos sobrepostos (`jitter`), heatmaps de correlação e gráficos facetados.
- **Bioestatística e Ecologia:** Índices de diversidade de Shannon e Simpson (`vegan`), curvas de rarefação e análise de componentes principais (PCA).

---

## 🔗 9. Reprodutibilidade, Sessão e Relatórios

### 9.1. Compartilhamento por Link Único (Share via URL)
No menu *Compartilhar > Share link*, o RStation compacta todos os scripts abertos e parâmetros no hash da URL usando o algoritmo **LZ-String**. Copie o link gerado e envie para colegas, alunos ou colaboradores; ao abrir o link, a estação carrega o ambiente exatamente como você o configurou.

### 9.2. Salvar e Restaurar Sessão (`.webr-project`)
- **Salvar Sessão:** Baixa um arquivo JSON contendo todos os scripts, histórico e configurações do projeto.
- **Abrir Sessão:** Restaura instantaneamente todo o ambiente de trabalho a partir de um arquivo `.webr-project.json`.

### 9.3. Gerador de Relatório Profissional em PDF / HTML
No menu *Compartilhar > Relatório*, você pode gerar um documento estático compilado:
- Defina o título do relatório e o nome do autor/pesquisador.
- Marque quais elementos deseja incluir: **Scripts R**, **Gráficos Gerados** e/ou **Saídas do Console**.
- Visualize na impressão nativa do navegador ou faça o download direto do arquivo em formato `.pdf`.
