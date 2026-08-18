/**
 * webr — Etapa 3: Importador nuvem, multi-scripts, share, relatório & sessão
 */
(function () {
  var ctx = {};
  var tabs = [];
  var activeTabId = null;
  var tabCounter = 1;
  var monacoRef = null;
  var editorRef = null;
  var pendingExcel = null;

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeDataUrl(url) {
    var u = (url || "").trim();
    if (!u) return u;
    var gsMatch = u.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (gsMatch) {
      var gidMatch = u.match(/[?&#]gid=(\d+)/);
      var gid = gidMatch ? gidMatch[1] : "0";
      return (
        "https://docs.google.com/spreadsheets/d/" +
        gsMatch[1] +
        "/export?format=csv&gid=" +
        gid
      );
    }
    if (u.includes("github.com") && u.includes("/blob/")) {
      u = u.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
    }
    return u;
  }

  function getActiveTab() {
    return tabs.find(function (t) { return t.id === activeTabId; });
  }

  function saveCurrentModel() {
    if (!editorRef || !activeTabId) return;
    var tab = getActiveTab();
    if (tab && tab.model) tab.content = tab.model.getValue();
  }

  function renderScriptTabs() {
    var list = document.getElementById("script-tabs-list");
    if (!list) return;
    list.innerHTML = "";
    tabs.forEach(function (tab) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "script-tab" + (tab.id === activeTabId ? " active" : "");
      btn.innerHTML =
        '<span class="script-tab-name">' + esc(tab.name) + "</span>" +
        (tabs.length > 1
          ? '<span class="script-tab-close" data-id="' + tab.id + '" title="Fechar">&times;</span>'
          : "");
      btn.addEventListener("click", function (e) {
        if (e.target.classList.contains("script-tab-close")) return;
        switchTab(tab.id);
      });
      var closeEl = btn.querySelector(".script-tab-close");
      if (closeEl) {
        closeEl.addEventListener("click", function (e) {
          e.stopPropagation();
          closeTab(tab.id);
        });
      }
      btn.addEventListener("dblclick", function (e) {
        e.stopPropagation();
        renameTab(tab.id);
      });
      list.appendChild(btn);
    });
    var titleEl = document.querySelector(".pane-editor .pane-title span:last-child");
    if (titleEl) {
      var active = getActiveTab();
      if (active) titleEl.textContent = active.name;
    }
  }

  function switchTab(id) {
    saveCurrentModel();
    var tab = tabs.find(function (t) { return t.id === id; });
    if (!tab || !editorRef) return;
    activeTabId = id;
    editorRef.setModel(tab.model);
    renderScriptTabs();
  }

  function createTab(name, content) {
    var id = "tab-" + tabCounter++;
    var model = monacoRef.editor.createModel(content || "", "r");
    tabs.push({ id: id, name: name || "script" + tabs.length + ".R", model: model, content: content || "" });
    switchTab(id);
    return id;
  }

  function closeTab(id) {
    if (tabs.length <= 1) {
      if (ctx.showToast) ctx.showToast("Mantenha ao menos um script aberto.");
      return;
    }
    var idx = tabs.findIndex(function (t) { return t.id === id; });
    if (idx < 0) return;
    if (tabs[idx].model) tabs[idx].model.dispose();
    tabs.splice(idx, 1);
    if (activeTabId === id) switchTab(tabs[Math.max(0, idx - 1)].id);
    else renderScriptTabs();
  }

  function renameTab(id) {
    var tab = tabs.find(function (t) { return t.id === id; });
    if (!tab) return;
    var name = prompt("Renomear script:", tab.name);
    if (!name || !name.trim()) return;
    tab.name = name.trim().endsWith(".R") ? name.trim() : name.trim() + ".R";
    renderScriptTabs();
  }

  function initMultiTabs(editor, monaco) {
    editorRef = editor;
    monacoRef = monaco;
    var initial = editor.getModel().getValue();
    editor.getModel().dispose();
    tabs = [];
    tabCounter = 1;
    createTab("script.R", initial);
    document.getElementById("btn-new-script-tab").addEventListener("click", function () {
      createTab("script" + tabs.length + ".R", "# Novo script R\n");
    });
    document.getElementById("btn-download-scripts-zip").addEventListener("click", downloadScriptsZip);
    loadFromHash();
  }

  function getAllScripts() {
    saveCurrentModel();
    return tabs.map(function (t) {
      return { name: t.name, content: t.model ? t.model.getValue() : t.content };
    });
  }

  function setScripts(scriptList, activeIndex) {
    tabs.forEach(function (t) { if (t.model) t.model.dispose(); });
    tabs = [];
    tabCounter = 1;
    scriptList.forEach(function (s, i) {
      var id = "tab-" + tabCounter++;
      var model = monacoRef.editor.createModel(s.content || "", "r");
      tabs.push({ id: id, name: s.name || "script" + (i + 1) + ".R", model: model, content: s.content });
    });
    switchTab(tabs[activeIndex || 0].id);
  }

  async function fetchUrlData() {
    var input = document.getElementById("url-import-input");
    var url = normalizeDataUrl(input.value);
    if (!url) {
      if (ctx.showToast) ctx.showToast("Informe uma URL.", "error");
      return;
    }
    var webR = ctx.getWebR && ctx.getWebR();
    if (!webR) {
      if (ctx.showToast) ctx.showToast("Aguarde o webR inicializar.", "error");
      return;
    }
    var status = document.getElementById("url-import-status");
    status.textContent = "Baixando...";
    try {
      var res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      var text = await res.text();
      var fname = "url_import_" + Date.now() + ".csv";
      var path = "/home/web_user/uploads/" + fname;
      await webR.FS.writeFile(path, new TextEncoder().encode(text));
      var varName = "dados_url";
      var code =
        varName +
        ' <- read.csv("' +
        path +
        '", stringsAsFactors = FALSE)\nhead(' +
        varName +
        ")\n";
      if (ctx.runRCode) await ctx.runRCode(code);
      if (ctx.registerUpload) ctx.registerUpload({ name: fname, path: path, size: text.length });
      if (ctx.appendConsoleLine) ctx.appendConsoleLine("✓ Dados importados de URL: " + url, "system");
      status.textContent = "Importado como " + fname;
      if (ctx.showToast) ctx.showToast("CSV da URL carregado no R!");
      if (ctx.loadDataFrameToGrid) ctx.loadDataFrameToGrid(varName);
      if (ctx.renderFileList) ctx.renderFileList();
    } catch (err) {
      status.textContent = "Erro: " + err.message;
      if (ctx.showToast) ctx.showToast("Falha ao importar URL (CORS?).", "error");
    }
  }

  function onExcelFileSelected(file) {
    if (!file || typeof XLSX === "undefined") return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var data = new Uint8Array(e.target.result);
      var wb = XLSX.read(data, { type: "array" });
      pendingExcel = { file: file, wb: wb, sheetNames: wb.SheetNames };
      var sel = document.getElementById("excel-sheet-select");
      sel.innerHTML = "";
      wb.SheetNames.forEach(function (name) {
        var opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        sel.appendChild(opt);
      });
      previewExcelSheet(wb.SheetNames[0]);
      document.getElementById("modal-excel-import").classList.add("show");
    };
    reader.readAsArrayBuffer(file);
  }

  function previewExcelSheet(sheetName) {
    if (!pendingExcel) return;
    var sheet = pendingExcel.wb.Sheets[sheetName];
    var json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    var preview = json.slice(0, 5);
    var host = document.getElementById("excel-preview-table");
    if (!preview.length) {
      host.innerHTML = "<p><em>Planilha vazia.</em></p>";
      return;
    }
    var cols = Object.keys(preview[0]);
    var html = "<table class='data-table'><thead><tr>" + cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
    preview.forEach(function (row) {
      html += "<tr>" + cols.map(function (c) { return "<td>" + esc(row[c]) + "</td>"; }).join("") + "</tr>";
    });
    html += "</tbody></table>";
    host.innerHTML = html;
  }

  async function confirmExcelImport() {
    if (!pendingExcel) return;
    var sheetName = document.getElementById("excel-sheet-select").value;
    var webR = ctx.getWebR && ctx.getWebR();
    if (!webR) return;
    var sheet = pendingExcel.wb.Sheets[sheetName];
    var csv = XLSX.utils.sheet_to_csv(sheet);
    var base = pendingExcel.file.name.replace(/\.[^.]+$/, "");
    var fname = base + "_" + sheetName.replace(/[^a-zA-Z0-9_-]/g, "_") + ".csv";
    var path = "/home/web_user/uploads/" + fname;
    await webR.FS.writeFile(path, new TextEncoder().encode(csv));
    var varName = base.replace(/[^a-zA-Z0-9_]/g, "_") || "dados_excel";
    var code = varName + ' <- read.csv("' + path + '", stringsAsFactors = FALSE)\nhead(' + varName + ")\n";
    if (ctx.runRCode) await ctx.runRCode(code);
    document.getElementById("modal-excel-import").classList.remove("show");
    if (ctx.showToast) ctx.showToast("Aba '" + sheetName + "' importada!");
    if (ctx.loadDataFrameToGrid) ctx.loadDataFrameToGrid(varName);
    pendingExcel = null;
  }

  function generateShareLink() {
    saveCurrentModel();
    var scripts = getAllScripts();
    var payload = {
      v: 1,
      scripts: scripts,
      active: tabs.findIndex(function (t) { return t.id === activeTabId; })
    };
    if (typeof LZString === "undefined") {
      if (ctx.showToast) ctx.showToast("LZ-String não carregado.", "error");
      return;
    }
    var compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
    var link = location.origin + location.pathname + "#code=" + compressed;
    var out = document.getElementById("share-link-output");
    out.value = link;
    document.getElementById("modal-share").classList.add("show");
  }

  function loadFromHash() {
    if (!location.hash || typeof LZString === "undefined") return;
    var m = location.hash.match(/code=([^&]+)/);
    if (!m) return;
    try {
      var json = LZString.decompressFromEncodedURIComponent(m[1]);
      if (!json) return;
      var data = JSON.parse(json);
      if (data.scripts && data.scripts.length) {
        setScripts(data.scripts, data.active || 0);
        if (ctx.showToast) ctx.showToast("Script(s) carregados do link!");
      } else if (typeof data === "string") {
        setScripts([{ name: "shared.R", content: data }], 0);
      }
    } catch (_) {}
  }

  async function downloadScriptsZip() {
    if (typeof JSZip === "undefined") {
      if (ctx.showToast) ctx.showToast("JSZip não carregado.", "error");
      return;
    }
    saveCurrentModel();
    var zip = new JSZip();
    tabs.forEach(function (t) {
      zip.file(t.name, t.model.getValue());
    });
    var blob = await zip.generateAsync({ type: "blob" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "webr_scripts.zip";
    link.click();
    if (ctx.showToast) ctx.showToast("Scripts exportados em ZIP!");
  }

  function exportHtmlReport() {
    saveCurrentModel();
    var scripts = getAllScripts();
    var plots = ctx.getPlotSnapshots ? ctx.getPlotSnapshots() : [];
    var consoleEl = document.getElementById("console-output");
    var consoleText = consoleEl ? consoleEl.innerText.slice(-8000) : "";
    var codeBlock = scripts
      .map(function (s) {
        return "<h3>" + esc(s.name) + "</h3><pre>" + esc(s.content) + "</pre>";
      })
      .join("");
    var plotsHtml = plots
      .map(function (p) {
        return '<figure><img src="' + p.dataUrl + '" alt="Gráfico ' + p.index + '" style="max-width:100%;"/><figcaption>Gráfico #' + p.index + "</figcaption></figure>";
      })
      .join("");
    var html =
      "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='utf-8'/><title>Relatório webr</title>" +
      "<style>body{font-family:Inter,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;line-height:1.5}" +
      "pre{background:#f6f8fa;padding:1rem;overflow:auto;border-radius:6px;font-size:0.85rem}" +
      "figure{margin:1.5rem 0;text-align:center}figcaption{color:#666;font-size:0.85rem}" +
      "h1{color:#276DC3}.console{background:#0d1117;color:#c9d1d9;padding:1rem;border-radius:6px;white-space:pre-wrap;font-size:0.8rem}</style></head><body>" +
      "<h1>Relatório webR Station</h1><p>Gerado em " + new Date().toLocaleString("pt-BR") + "</p>" +
      "<h2>Scripts R</h2>" + codeBlock +
      "<h2>Console (trecho)</h2><div class='console'>" + esc(consoleText) + "</div>" +
      (plotsHtml ? "<h2>Gráficos</h2>" + plotsHtml : "") +
      "</body></html>";
    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "webr_relatorio_" + Date.now() + ".html";
    link.click();
    if (ctx.showToast) ctx.showToast("Relatório HTML exportado!");
  }

  function saveSession() {
    saveCurrentModel();
    var session = {
      version: 1,
      app: "webr",
      savedAt: new Date().toISOString(),
      scripts: getAllScripts(),
      activeScript: tabs.findIndex(function (t) { return t.id === activeTabId; }),
      plots: ctx.getPlotSnapshots ? ctx.getPlotSnapshots() : [],
      console: document.getElementById("console-output")
        ? document.getElementById("console-output").innerText.slice(-12000)
        : ""
    };
    var blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sessao_" + Date.now() + ".webr-project.json";
    link.click();
    if (ctx.showToast) ctx.showToast("Sessão salva (.webr-project.json)!");
  }

  function loadSessionFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var session = JSON.parse(e.target.result);
        if (session.scripts) setScripts(session.scripts, session.activeScript || 0);
        if (session.console && ctx.appendConsoleLine) {
          document.getElementById("console-output").innerHTML = "";
          session.console.split("\n").forEach(function (line) {
            if (line.trim()) ctx.appendConsoleLine(line, "stdout");
          });
        }
        if (ctx.showToast) ctx.showToast("Sessão carregada!");
      } catch (err) {
        if (ctx.showToast) ctx.showToast("Arquivo de sessão inválido.", "error");
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    document.getElementById("btn-url-import").addEventListener("click", fetchUrlData);
    document.getElementById("excel-file-picker").addEventListener("change", function (e) {
      if (e.target.files[0]) onExcelFileSelected(e.target.files[0]);
    });
    document.getElementById("excel-sheet-select").addEventListener("change", function (e) {
      previewExcelSheet(e.target.value);
    });
    document.getElementById("btn-excel-confirm").addEventListener("click", confirmExcelImport);
    document.getElementById("btn-excel-cancel").addEventListener("click", function () {
      document.getElementById("modal-excel-import").classList.remove("show");
      pendingExcel = null;
    });
    document.getElementById("btn-share-link").addEventListener("click", generateShareLink);
    document.getElementById("btn-copy-share-link").addEventListener("click", function () {
      var out = document.getElementById("share-link-output");
      navigator.clipboard.writeText(out.value);
      if (ctx.showToast) ctx.showToast("Link copiado!");
    });
    document.getElementById("btn-close-share").addEventListener("click", function () {
      document.getElementById("modal-share").classList.remove("show");
    });
    document.getElementById("btn-export-report").addEventListener("click", exportHtmlReport);
    document.getElementById("btn-save-session").addEventListener("click", saveSession);
    document.getElementById("session-file-picker").addEventListener("change", function (e) {
      if (e.target.files[0]) loadSessionFile(e.target.files[0]);
    });
  }

  window.webrSession = {
    init: function (options) {
      ctx = options || {};
      bindEvents();
    },
    initMultiTabs: initMultiTabs,
    getEditor: function () { return editorRef; },
    getAllScripts: getAllScripts
  };
})();
