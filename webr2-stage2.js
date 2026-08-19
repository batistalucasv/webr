/**
 * webr — Etapa 2: snippets e paleta Ctrl+K
 * IA Copilot foi transferida para webrtest (webrtest-copilot.js).
 */
(function () {
  var STORAGE_PREFIX = "webr-ai-";
  var lastError = null;
  var ctx = {};

  var SNIPPETS = {
    tidyverse: {
      label: "Tidyverse",
      icon: "bi-funnel-fill",
      items: [
        {
          title: "Filtrar e selecionar (dplyr)",
          code: `# dplyr: filtrar, selecionar e ordenar\nlibrary(dplyr)\ndata(iris)\niris |>\n  filter(Species == "setosa", Sepal.Length > 5) |>\n  select(Species, Sepal.Length, Petal.Length) |>\n  arrange(desc(Sepal.Length))\n`
        },
        {
          title: "Agrupar e resumir",
          code: `# Resumo por grupo\nlibrary(dplyr)\ndata(iris)\niris |>\n  group_by(Species) |>\n  summarise(\n    n = n(),\n    media_sepal = mean(Sepal.Length),\n    sd_petal = sd(Petal.Length)\n  )\n`
        },
        {
          title: "Pivot longer / wider (tidyr)",
          code: `library(tidyr)\ndata(iris)\nlong <- iris |>\n  pivot_longer(cols = starts_with("Sepal"), names_to = "parte", values_to = "cm")\nhead(long, 8)\n`
        },
        {
          title: "Manipulação de texto (stringr)",
          code: `library(stringr)\nfrutas <- c("  Maçã ", "Banana", "Laranja  ")\ntibble(fruta = frutas) |>\n  mutate(limpa = str_trim(str_to_lower(fruta)), tamanho = str_length(limpa))\n`
        }
      ]
    },
    estatistica: {
      label: "Estatística",
      icon: "bi-calculator-fill",
      items: [
        {
          title: "Teste t (duas amostras)",
          code: `data(mtcars)\nt.test(mpg ~ am, data = mtcars)\n`
        },
        {
          title: "ANOVA one-way",
          code: `data(iris)\naov(Sepal.Length ~ Species, data = iris) |> summary()\n`
        },
        {
          title: "Mann-Whitney (não paramétrico)",
          code: `data(mtcars)\nwilcox.test(mpg ~ am, data = mtcars)\n`
        },
        {
          title: "Qui-quadrado",
          code: `data(Titanic)\ntab <- margin.table(Titanic, c(1, 2))\nchisq.test(tab)\n`
        }
      ]
    },
    modelagem: {
      label: "Modelagem",
      icon: "bi-graph-up-arrow",
      items: [
        {
          title: "Regressão linear (lm)",
          code: `data(mtcars)\nmodelo <- lm(mpg ~ wt + hp + cyl, data = mtcars)\nsummary(modelo)\n`
        },
        {
          title: "GLM (logística)",
          code: `data(mtcars)\nmodelo_glm <- glm(am ~ mpg + wt, data = mtcars, family = binomial)\nsummary(modelo_glm)\n`
        },
        {
          title: "Diagnóstico de resíduos",
          code: `data(mtcars)\nmodelo <- lm(mpg ~ wt, data = mtcars)\npar(mfrow = c(2, 2))\nplot(modelo)\n`
        }
      ]
    },
    ggplot2: {
      label: "ggplot2",
      icon: "bi-palette-fill",
      items: [
        {
          title: "Dispersão + tendência",
          code: `if (!requireNamespace("ggplot2", quietly = TRUE)) webr::install("ggplot2")\nlibrary(ggplot2)\ndata(iris)\nggplot(iris, aes(Sepal.Length, Petal.Length, color = Species)) +\n  geom_point() +\n  geom_smooth(method = "lm", se = TRUE) +\n  theme_minimal()\n`
        },
        {
          title: "Boxplot + jitter",
          code: `library(ggplot2)\ndata(iris)\nggplot(iris, aes(Species, Petal.Length, fill = Species)) +\n  geom_boxplot(alpha = 0.6, outlier.shape = NA) +\n  geom_jitter(width = 0.15, alpha = 0.5) +\n  theme_minimal() +\n  theme(legend.position = "none")\n`
        },
        {
          title: "Heatmap de correlação",
          code: `library(ggplot2)\ndata(mtcars)\ncor_mat <- cor(mtcars[, c("mpg", "wt", "hp", "cyl")])\ndf_cor <- as.data.frame(as.table(cor_mat))\nggplot(df_cor, aes(Var1, Var2, fill = Freq)) +\n  geom_tile() +\n  scale_fill_gradient2(low = "#2166ac", mid = "white", high = "#b2182b", midpoint = 0) +\n  theme_minimal() +\n  theme(axis.text.x = element_text(angle = 45, hjust = 1))\n`
        },
        {
          title: "Faceted plots",
          code: `library(ggplot2)\ndata(iris)\nggplot(iris, aes(Petal.Length, Petal.Width)) +\n  geom_point(aes(color = Species)) +\n  facet_wrap(~ Species, scales = "free") +\n  theme_minimal()\n`
        }
      ]
    },
    bioecologia: {
      label: "Bio / Ecologia",
      icon: "bi-tree-fill",
      items: [
        {
          title: "Índices de diversidade (vegan)",
          code: `if (!requireNamespace("vegan", quietly = TRUE)) webr::install("vegan")\nlibrary(vegan)\n# Matriz fictícia espécies x locais\ncomm <- matrix(sample(0:20, 30, replace = TRUE), nrow = 6)\nrownames(comm) <- paste0("sp", 1:6)\ncolnames(comm) <- paste0("loc", 1:5)\ndiversity(comm)\n`
        },
        {
          title: "Matriz de correlação",
          code: `data(mtcars)\ncor(mtcars[, c("mpg", "disp", "hp", "wt", "qsec")])\n`
        },
        {
          title: "PCA (prcomp)",
          code: `data(iris)\nnums <- iris[, 1:4]\npca <- prcomp(nums, scale. = TRUE)\nsummary(pca)\nplot(pca$x[, 1:2], col = as.numeric(iris$Species), pch = 19,\n     xlab = "PC1", ylab = "PC2", main = "PCA — Iris")\n`
        }
      ]
    }
  };

  function loadAiConfig() {
    return {
      provider: localStorage.getItem(STORAGE_PREFIX + "provider") || "openai",
      openai: localStorage.getItem(STORAGE_PREFIX + "key-openai") || "",
      groq: localStorage.getItem(STORAGE_PREFIX + "key-groq") || "",
      anthropic: localStorage.getItem(STORAGE_PREFIX + "key-anthropic") || "",
      gemini: localStorage.getItem(STORAGE_PREFIX + "key-gemini") || "",
      model: localStorage.getItem(STORAGE_PREFIX + "model") || ""
    };
  }

  function saveAiConfig(cfg) {
    localStorage.setItem(STORAGE_PREFIX + "provider", cfg.provider);
    localStorage.setItem(STORAGE_PREFIX + "key-openai", cfg.openai);
    localStorage.setItem(STORAGE_PREFIX + "key-groq", cfg.groq);
    localStorage.setItem(STORAGE_PREFIX + "key-anthropic", cfg.anthropic);
    localStorage.setItem(STORAGE_PREFIX + "key-gemini", cfg.gemini);
    if (cfg.model) localStorage.setItem(STORAGE_PREFIX + "model", cfg.model);
  }

  function getApiKey(cfg) {
    var map = { openai: cfg.openai, groq: cfg.groq, anthropic: cfg.anthropic, gemini: cfg.gemini };
    return map[cfg.provider] || "";
  }

  function defaultModel(provider) {
    var models = {
      openai: "gpt-4o-mini",
      groq: "openai/gpt-oss-20b",
      anthropic: "claude-3-5-haiku-latest",
      gemini: "gemini-2.0-flash"
    };
    return models[provider] || "gpt-4o-mini";
  }

  function resolveModel(provider, model) {
    var groqRetired = {
      "llama-3.3-70b-versatile": "openai/gpt-oss-20b",
      "llama-3.1-8b-instant": "openai/gpt-oss-20b",
      "llama3-70b-8192": "openai/gpt-oss-20b",
      "llama3-8b-8192": "openai/gpt-oss-20b"
    };
    var m = model || defaultModel(provider);
    if (provider === "groq" && groqRetired[m]) return groqRetired[m];
    return m;
  }

  function extractCodeBlock(text) {
    var m = text.match(/```(?:r|R)?\s*([\s\S]*?)```/);
    if (m) return m[1].trim();
    return text.trim();
  }

  async function buildContextPrompt(extra) {
    var editor = ctx.getEditor ? ctx.getEditor() : null;
    var code = editor ? editor.getValue().slice(0, 4000) : "";
    var envHint = "";
    try {
      var webR = ctx.getWebR ? ctx.getWebR() : null;
      if (webR) {
        var objs = await webR.evalR("paste(ls(envir=.GlobalEnv), collapse=', ')");
        envHint = await objs.toString();
      }
    } catch (_) {}
    return (
      "Você é um assistente especialista em R para webR (R no navegador via WASM).\n" +
      "Responda em português brasileiro. Para código, use bloco ```r ... ```.\n" +
      "Objetos no GlobalEnv: " + (envHint || "(vazio)") + "\n\n" +
      "Script atual do editor:\n```r\n" + code + "\n```\n\n" +
      (extra || "")
    );
  }

  async function callAI(userMessage, systemExtra) {
    var cfg = loadAiConfig();
    var key = getApiKey(cfg);
    if (!key) throw new Error("Configure sua chave de API no painel Copilot (⚙).");

    var system = await buildContextPrompt(systemExtra);
    var model = resolveModel(cfg.provider, cfg.model);

    if (cfg.provider === "gemini") {
      var url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent?key=" +
        encodeURIComponent(key);
      var res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: system + "\n\n" + userMessage }] }]
        })
      });
      if (!res.ok) throw new Error("Gemini: " + res.status + " " + (await res.text()).slice(0, 200));
      var data = await res.json();
      return data.candidates[0].content.parts.map(function (p) { return p.text; }).join("");
    }

    if (cfg.provider === "anthropic") {
      var resA = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 2048,
          system: system,
          messages: [{ role: "user", content: userMessage }]
        })
      });
      if (!resA.ok) throw new Error("Anthropic: " + resA.status + " " + (await resA.text()).slice(0, 200));
      var dataA = await resA.json();
      return dataA.content.map(function (b) { return b.text; }).join("");
    }

    var baseUrl =
      cfg.provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

    var resO = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMessage }
        ],
        temperature: 0.3
      })
    });
    if (!resO.ok) throw new Error(cfg.provider + ": " + resO.status + " " + (await resO.text()).slice(0, 200));
    var dataO = await resO.json();
    return dataO.choices[0].message.content;
  }

  function appendChatMessage(role, text, isError) {
    var box = document.getElementById("copilot-messages");
    if (!box) return;
    var div = document.createElement("div");
    div.className = "copilot-msg copilot-msg-" + role + (isError ? " copilot-msg-error" : "");
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function showErrorBar(message, code) {
    lastError = { message: message, code: code || "", ts: Date.now() };
    var bar = document.getElementById("console-error-bar");
    var txt = document.getElementById("console-error-text");
    if (!bar || !txt) return;
    txt.textContent = message.slice(0, 280);
    bar.classList.add("show");
  }

  function hideErrorBar() {
    var bar = document.getElementById("console-error-bar");
    if (bar) bar.classList.remove("show");
  }

  function renderSnippets() {
    var host = document.getElementById("snippets-list");
    if (!host) return;
    host.innerHTML = "";
    Object.keys(SNIPPETS).forEach(function (catKey) {
      var cat = SNIPPETS[catKey];
      var section = document.createElement("div");
      section.className = "snippets-category";
      section.innerHTML =
        '<h4><i class="bi ' + cat.icon + '"></i> ' + cat.label + "</h4>";
      cat.items.forEach(function (item) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "snippet-item";
        btn.innerHTML = "<strong>" + item.title + "</strong>";
        btn.addEventListener("click", function () {
          insertSnippet(item.code);
          closeSnippets();
          if (ctx.showToast) ctx.showToast("Snippet inserido no editor!");
        });
        section.appendChild(btn);
      });
      host.appendChild(section);
    });
  }

  function insertSnippet(code) {
    var editor = ctx.getEditor ? ctx.getEditor() : null;
    if (!editor) return;
    var cur = editor.getValue();
    editor.setValue(cur + (cur.endsWith("\n") ? "" : "\n") + code + "\n");
    editor.revealLine(editor.getModel().getLineCount());
  }

  function openCopilot() {
    var panel = document.getElementById("copilot-panel");
    if (panel) panel.classList.add("open");
  }

  function closeCopilot() {
    var panel = document.getElementById("copilot-panel");
    if (panel) panel.classList.remove("open");
  }

  function openSnippets() {
    document.getElementById("snippets-drawer").classList.add("open");
    var bd = document.getElementById("snippets-backdrop");
    if (bd) bd.classList.add("show-backdrop");
    renderSnippets();
  }

  function closeSnippets() {
    document.getElementById("snippets-drawer").classList.remove("open");
    var bd = document.getElementById("snippets-backdrop");
    if (bd) bd.classList.remove("show-backdrop");
  }

  function openPalette() {
    var el = document.getElementById("command-palette");
    var input = document.getElementById("palette-input");
    el.classList.add("show");
    input.value = "";
    renderPalette("");
    setTimeout(function () { input.focus(); }, 50);
  }

  function closePalette() {
    document.getElementById("command-palette").classList.remove("show");
  }

  function getPaletteActions() {
    return [
      { id: "run", label: "Executar seleção ou linha", hint: "Ctrl+Enter", run: function () { ctx.executeSelectionOrLine && ctx.executeSelectionOrLine(); } },
      { id: "run-all", label: "Executar script completo", hint: "Shift+Enter", run: function () { ctx.executeAllCode && ctx.executeAllCode(); } },
      { id: "clear-console", label: "Limpar console", run: function () { ctx.clearConsole && ctx.clearConsole(); } },
      { id: "theme", label: "Alternar tema claro/escuro", run: function () { ctx.toggleTheme && ctx.toggleTheme(); } },
      { id: "snippets", label: "Abrir biblioteca de Snippets", run: openSnippets },
      { id: "tab-console", label: "Ir para aba Console", run: function () { ctx.switchTab && ctx.switchTab("console"); } },
      { id: "tab-data", label: "Ir para aba Dados", run: function () { ctx.switchTab && ctx.switchTab("data"); } },
      { id: "tab-plots", label: "Ir para aba Gráficos", run: function () { ctx.switchTab && ctx.switchTab("plots"); } },
      { id: "iris", label: "Carregar dataset iris no grid", run: function () { ctx.loadDataFrameToGrid && ctx.loadDataFrameToGrid("iris"); } },
      { id: "mtcars", label: "Carregar dataset mtcars no grid", run: function () { ctx.loadDataFrameToGrid && ctx.loadDataFrameToGrid("mtcars"); } },
      { id: "clear-env", label: "Limpar ambiente R (rm list)", run: function () { ctx.runRCode && ctx.runRCode("rm(list = ls())"); } },
      { id: "reset-editor", label: "Restaurar exemplo EDA no editor", run: function () {
        var ed = ctx.getEditor && ctx.getEditor();
        if (ed && ctx.EXAMPLES) ed.setValue(ctx.EXAMPLES.eda);
      }}
    ];
  }

  function renderPalette(query) {
    var list = document.getElementById("palette-results");
    if (!list) return;
    var q = (query || "").toLowerCase();
    var actions = getPaletteActions().filter(function (a) {
      return !q || a.label.toLowerCase().includes(q);
    });
    list.innerHTML = "";
    actions.forEach(function (a, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette-item" + (idx === 0 ? " active" : "");
      btn.dataset.id = a.id;
      btn.innerHTML =
        "<span>" + a.label + "</span>" +
        (a.hint ? '<kbd class="palette-hint">' + a.hint + "</kbd>" : "");
      btn.addEventListener("click", function () { runPaletteAction(a); });
      list.appendChild(btn);
    });
    list.dataset.activeIdx = "0";
  }

  function runPaletteAction(action) {
    closePalette();
    if (action && action.run) action.run();
  }

  function bindEvents() {
    var openCopilotBtn = document.getElementById("btn-open-copilot");
    if (openCopilotBtn) openCopilotBtn.addEventListener("click", openCopilot);
    var closeCopilotBtn = document.getElementById("btn-close-copilot");
    if (closeCopilotBtn) closeCopilotBtn.addEventListener("click", closeCopilot);
    document.getElementById("btn-open-snippets").addEventListener("click", openSnippets);
    document.getElementById("btn-close-snippets").addEventListener("click", closeSnippets);
    document.getElementById("snippets-backdrop").addEventListener("click", closeSnippets);

    var sendBtn = document.getElementById("btn-copilot-send");
    if (sendBtn) sendBtn.addEventListener("click", sendCopilotMessage);
    var copilotInput = document.getElementById("copilot-input");
    if (copilotInput) copilotInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendCopilotMessage();
      }
    });

    var settingsBtn = document.getElementById("btn-copilot-settings");
    if (settingsBtn) settingsBtn.addEventListener("click", function () {
      document.getElementById("copilot-settings").classList.toggle("open");
      var cfg = loadAiConfig();
      document.getElementById("ai-provider").value = cfg.provider;
      document.getElementById("ai-key-openai").value = cfg.openai;
      document.getElementById("ai-key-groq").value = cfg.groq;
      document.getElementById("ai-key-anthropic").value = cfg.anthropic;
      document.getElementById("ai-key-gemini").value = cfg.gemini;
      document.getElementById("ai-model").value = resolveModel(cfg.provider, cfg.model);
    });

    var saveAiBtn = document.getElementById("btn-save-ai-config");
    if (saveAiBtn) saveAiBtn.addEventListener("click", function () {
      saveAiConfig({
        provider: document.getElementById("ai-provider").value,
        openai: document.getElementById("ai-key-openai").value.trim(),
        groq: document.getElementById("ai-key-groq").value.trim(),
        anthropic: document.getElementById("ai-key-anthropic").value.trim(),
        gemini: document.getElementById("ai-key-gemini").value.trim(),
        model: document.getElementById("ai-model").value.trim()
      });
      if (ctx.showToast) ctx.showToast("Chaves de API salvas localmente.");
      document.getElementById("copilot-settings").classList.remove("open");
    });

    var fixBtn = document.getElementById("btn-fix-error");
    if (fixBtn) fixBtn.addEventListener("click", explainAndFixError);
    var dismissBtn = document.getElementById("btn-dismiss-error");
    if (dismissBtn) dismissBtn.addEventListener("click", hideErrorBar);

    var applyFixBtn = document.getElementById("btn-apply-fix");
    if (applyFixBtn) applyFixBtn.addEventListener("click", function () {
      var pre = document.getElementById("fix-suggestion-code");
      if (!pre) return;
      var code = pre.textContent;
      var ed = ctx.getEditor && ctx.getEditor();
      if (ed && code) {
        ed.setValue(code);
        if (ctx.showToast) ctx.showToast("Correção aplicada ao editor!");
        document.getElementById("fix-suggestion-panel").classList.remove("show");
        hideErrorBar();
      }
    });

    var paletteInput = document.getElementById("palette-input");
    paletteInput.addEventListener("input", function () { renderPalette(paletteInput.value); });
    paletteInput.addEventListener("keydown", function (e) {
      var list = document.getElementById("palette-results");
      var items = list.querySelectorAll(".palette-item");
      var idx = parseInt(list.dataset.activeIdx || "0", 10);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        idx = Math.min(items.length - 1, idx + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        idx = Math.max(0, idx - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (items[idx]) items[idx].click();
        return;
      } else if (e.key === "Escape") {
        closePalette();
        return;
      } else return;
      items.forEach(function (el, i) { el.classList.toggle("active", i === idx); });
      list.dataset.activeIdx = String(idx);
    });

    document.getElementById("command-palette").addEventListener("click", function (e) {
      if (e.target.id === "command-palette") closePalette();
    });

    document.addEventListener("keydown", function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
    });
  }

  async function sendCopilotMessage() {
    var input = document.getElementById("copilot-input");
    if (!input) return;
    var msg = input.value.trim();
    if (!msg) return;
    input.value = "";
    appendChatMessage("user", msg);
    appendChatMessage("assistant", "Pensando...");
    var pending = document.getElementById("copilot-messages").lastChild;
    try {
      var reply = await callAI(msg, "");
      pending.textContent = reply;
    } catch (err) {
      pending.classList.add("copilot-msg-error");
      pending.textContent = "Erro: " + err.message;
    }
  }

  async function explainAndFixError() {
    if (!lastError) {
      if (ctx.showToast) ctx.showToast("Nenhum erro recente capturado.", "error");
      return;
    }
    var panel = document.getElementById("fix-suggestion-panel");
    var pre = document.getElementById("fix-suggestion-code");
    var expl = document.getElementById("fix-suggestion-text");
    panel.classList.add("show");
    expl.textContent = "Analisando erro com IA...";
    pre.textContent = "";
    try {
      var prompt =
        "O código R abaixo produziu este erro:\n" +
        lastError.message +
        "\n\nCódigo:\n```r\n" +
        (lastError.code || "(não disponível)") +
        "\n```\n\nExplique brevemente a causa e forneça o código R corrigido completo.";
      var reply = await callAI(prompt, "Modo: diagnóstico e correção de erro R.");
      var parts = reply.split(/```/);
      expl.textContent = parts[0].trim() || reply;
      pre.textContent = extractCodeBlock(reply) || reply;
      openCopilot();
    } catch (err) {
      expl.textContent = "Não foi possível consultar a IA: " + err.message;
    }
  }

  function looksLikeRError(text) {
    if (!text) return false;
    var t = String(text);
    return (
      /(^|\n)\s*Error/i.test(t) ||
      /Error in /i.test(t) ||
      /object .* not found/i.test(t) ||
      /unexpected/i.test(t) ||
      /non-numeric argument/i.test(t) ||
      /dimensions.*not conform/i.test(t) ||
      /could not find function/i.test(t)
    );
  }

  window.webrProductivity = {
    init: function (options) {
      ctx = options || {};
      bindEvents();
      renderSnippets();
    },
    notifyStderr: function (text, code) {
      if (looksLikeRError(text)) showErrorBar(text, code);
    },
    notifyExecError: function (message, code) {
      showErrorBar(message, code);
    }
  };
})();
