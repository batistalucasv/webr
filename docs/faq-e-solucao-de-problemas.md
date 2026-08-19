# ❓ FAQ & Solução de Problemas — RStation Web

Respostas para dúvidas frequentes e soluções práticas para os problemas mais comuns encontrados ao utilizar e desenvolver no **RStation Web**.

---

## 💡 1. Perguntas Frequentes (FAQ)

### O RStation Web precisa de servidor backend para rodar o R?
**Não.** O RStation Web é 100% client-side. O interpretador oficial GNU R é compilado para WebAssembly (WASM) e roda diretamente dentro do motor JavaScript do navegador do usuário. Nenhum dado é enviado para servidores externos para processamento.

### O RStation Web funciona offline?
**Sim, parcialmente.** Após o carregamento inicial da página e do runtime do webR, as execuções de código R, manipulações de dados locais e gerações de gráficos ocorrem localmente sem necessidade de internet. A internet só é necessária para:
- Instalar novos pacotes R que ainda não foram baixados.
- Importar dados de URLs externas (Google Sheets, GitHub Raw).

### Quais pacotes do R funcionam no webR?
Todos os pacotes escritos em **R puro** funcionam perfeitamente. Pacotes que contêm código nativo em **C, C++ ou Fortran** (como `ggplot2`, `dplyr`, `vegan`, `data.table`, `Matrix`, `ape`) funcionam desde que estejam compilados para WebAssembly no repositório oficial da Posit PBC / webR.
> [!NOTE]
> Pacotes que dependem de bibliotecas Java (ex: `rJava`), conexões diretas de banco de dados via sockets de baixo nível sem WebSocket ou threads POSIX nativas sem suporte WASM podem ter limitações.

### O que acontece se eu fechar a aba do navegador?
Como a sessão do R reside na memória RAM da aba do navegador, fechar a aba limpa a sessão ativa. Para não perder seu trabalho:
- Utilize o menu **Arquivo > Salvar sessão** para baixar o arquivo `.webr-project`.
- Ou utilize **Compartilhar > Share link** para salvar o estado completo no link da URL.

### Qual é o tamanho máximo de arquivo suportado no upload?
O sistema de arquivos virtual (Emscripten VFS) armazena arquivos diretamente na memória alocada para o WebAssembly no navegador. Geralmente, arquivos de até **500 MB a 1 GB** funcionam com alta performance. Para arquivos muito volumosos, recomenda-se filtrar e selecionar apenas as colunas necessárias.

---

## 🔧 2. Diagnóstico & Solução de Problemas

### 2.1. Erro de CORS ao Importar Dados por URL (`Failed to fetch`)
**Sintoma:** Ao tentar importar um CSV de uma URL externa, o console acusa erro de *Cross-Origin Request Blocked (CORS)*.
- **Causa:** O servidor onde o arquivo está hospedado não envia o cabeçalho `Access-Control-Allow-Origin: *`.
- **Solução:**
  - Se estiver no **GitHub**, use o link direto para o arquivo bruto (`https://raw.githubusercontent.com/...`). O assistente de nuvem do RStation faz essa conversão automaticamente.
  - Se estiver no **Google Sheets**, certifique-se de que a planilha está configurada como *"Qualquer pessoa com o link pode visualizar"*.
  - Alternativamente, baixe o arquivo `.csv` para o seu computador e faça o upload por arrastar e soltar (drag & drop).

---

### 2.2. Caracteres Acentuados Quebrados ao Importar CSV (`` ou `Ã©`)
**Sintoma:** Palavras com acentos em português (como `Atenção`, `Espécie`, `Média`) aparecem desconfiguradas.
- **Causa:** O arquivo foi gerado em codificação legada do Windows (`Windows-1252` / `Latin1`) em vez de `UTF-8`.
- **Solução:**
  - No **Assistente de CSV** do RStation Web, altere o campo **Encoding** de `UTF-8` para `Windows-1252`.
  - O preview será atualizado instantaneamente com os acentos corrigidos antes de enviar para o R.

---

### 2.3. O Gráfico Não Aparece na Aba de Gráficos
**Sintoma:** O código de plotagem foi executado no editor, mas o painel permanece em branco.
- **Causa:**
  - O código R pode ter sido interrompido antes da conclusão.
  - Em `ggplot2`, esquecer de chamar o objeto gerado (ex: criar `p <- ggplot(...)` sem executar `p`).
- **Solução:**
  - Certifique-se de que o comando de plotagem imprime o resultado diretamente (ex: digite `p` na última linha).
  - Verifique na aba **Console** se houve alguma mensagem de erro de sintaxe.
  - Alterne para a aba **Gráficos** no painel de ferramentas.

---

### 2.4. Pacote com Falha na Instalação (`Package not available`)
**Sintoma:** Ao tentar instalar um pacote via aba Pacotes ou `webr::install()`, ocorre o erro:
`Package 'xyz' is not available for this version of webR`.
- **Causa:** O pacote ainda não foi compilado para binário WebAssembly no repositório central do webR.
- **Solução:**
  - Verifique se o nome do pacote foi digitado com as maiúsculas/minúsculas corretas (o R é sensível ao caso).
  - Consulte a lista de pacotes suportados no repositório oficial do [webR Contributed Packages](https://repo.r-wasm.org/).

---

### 2.5. Esgotamento de Memória do Navegador (*Out of Memory*)
**Sintoma:** A aba do navegador trava ou fecha repentinamente durante uma operação estatística pesada.
- **Causa:** O script R consumiu mais memória do que o limite alocado pelo navegador para o processo WASM.
- **Solução:**
  - Reduza o número de iterações em simulações ou use `head(meu_dataset, 50000)` para testes.
  - Utilize funções vetorizadas em vez de loops `for` profundos.
  - Recarregue a página para liberar a memória RAM alocada e restabelecer a sessão.
