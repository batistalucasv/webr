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

  function sanitizeScriptName(raw) {
    var name = String(raw == null ? "" : raw).trim();
    name = name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ");
    if (!name) name = "script.R";
    if (!/\.R$/i.test(name)) name += ".R";
    return name;
  }

  function getActiveScriptName() {
    var tab = getActiveTab();
    return tab ? tab.name : "script.R";
  }

  function renderScriptTabs() {
    var list = document.getElementById("script-tabs-list");
    if (!list) return;
    list.innerHTML = "";
    tabs.forEach(function (tab) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "script-tab" + (tab.id === activeTabId ? " active" : "");
      btn.title = tab.name + " — duplo clique para renomear";
      btn.innerHTML =
        '<span class="script-tab-name">' + esc(tab.name) + "</span>" +
        '<span class="script-tab-rename" data-id="' + tab.id + '" title="Renomear"><i class="bi bi-pencil"></i></span>' +
        (tabs.length > 1
          ? '<span class="script-tab-close" data-id="' + tab.id + '" title="Fechar">&times;</span>'
          : "");
      btn.addEventListener("click", function (e) {
        if (e.target.closest(".script-tab-close") || e.target.closest(".script-tab-rename")) return;
        switchTab(tab.id);
      });
      var renameEl = btn.querySelector(".script-tab-rename");
      if (renameEl) {
        renameEl.addEventListener("click", function (e) {
          e.stopPropagation();
          if (tab.id !== activeTabId) switchTab(tab.id);
          var fresh = document.querySelector("#script-tabs-list .script-tab.active");
          beginInlineRename(tab, fresh);
        });
      }
      var closeEl = btn.querySelector(".script-tab-close");
      if (closeEl) {
        closeEl.addEventListener("click", function (e) {
          e.stopPropagation();
          closeTab(tab.id);
        });
      }
      btn.addEventListener("dblclick", function (e) {
        if (e.target.closest(".script-tab-close")) return;
        e.stopPropagation();
        beginInlineRename(tab, btn);
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

  function applyTabName(tab, raw) {
    tab.name = sanitizeScriptName(raw);
  }

  function beginInlineRename(tab, btn) {
    if (!btn || btn.querySelector(".script-tab-rename-input")) return;
    var nameSpan = btn.querySelector(".script-tab-name");
    if (!nameSpan) return;
    var input = document.createElement("input");
    input.type = "text";
    input.className = "script-tab-rename-input";
    input.value = tab.name;
    input.setAttribute("aria-label", "Renomear script");
    input.spellcheck = false;
    nameSpan.replaceWith(input);
    var renameEl = btn.querySelector(".script-tab-rename");
    if (renameEl) renameEl.style.display = "none";
    input.focus();
    input.select();
    var done = false;
    function finish(commit) {
      if (done) return;
      done = true;
      if (commit) applyTabName(tab, input.value);
      renderScriptTabs();
    }
    input.addEventListener("keydown", function (e) {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    });
    input.addEventListener("click", function (e) { e.stopPropagation(); });
    input.addEventListener("mousedown", function (e) { e.stopPropagation(); });
    input.addEventListener("blur", function () { finish(true); });
  }

  function renameTab(id) {
    var tab = tabs.find(function (t) { return t.id === id; });
    if (!tab) return;
    renderScriptTabs();
    var list = document.getElementById("script-tabs-list");
    var btn = list && list.querySelector(".script-tab.active");
    if (tab.id !== activeTabId) {
      switchTab(tab.id);
      btn = list && list.querySelector(".script-tab.active");
    }
    beginInlineRename(tab, btn);
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
      if (ctx.showToast) ctx.showToast("Aguarde o RStation Web inicializar.", "error");
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

  function openReportPdfModal() {
    var modal = document.getElementById("modal-report-pdf");
    if (modal) modal.classList.add("show");
  }

  function closeReportPdfModal() {
    var modal = document.getElementById("modal-report-pdf");
    if (modal) modal.classList.remove("show");
  }

  function buildReportDocument(opts) {
    saveCurrentModel();
    var title = (opts && opts.title) || "Relatório de Análise Estatística — RStation Web";
    var author = (opts && opts.author) || "";
    var scripts = getAllScripts();
    var plots = ctx.getPlotSnapshots ? ctx.getPlotSnapshots() : [];
    
    // Extrair linhas do console preservando as quebras de linha reais
    var consoleEl = document.getElementById("console-output");
    var consoleLines = [];
    if (consoleEl) {
      var lineNodes = consoleEl.querySelectorAll(".console-line");
      if (lineNodes && lineNodes.length) {
        lineNodes.forEach(function (n) {
          var t = (n.textContent || "").trimEnd();
          if (t) consoleLines.push(t);
        });
      } else {
        consoleLines = (consoleEl.innerText || "").split(/\r?\n/).filter(function (l) { return l.trim(); });
      }
    }
    var consoleText = consoleLines.slice(-120).join("\n");

    var container = document.createElement("div");
    container.className = "webr-pdf-document";
    container.style.cssText = "font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2328; background: #ffffff; padding: 24px; max-width: 780px; width: 780px; margin: 0 auto; line-height: 1.5; font-size: 13px; box-sizing: border-box;";

    // Header
    var headerHtml = `
      <div style="border-bottom: 2px solid #276DC3; padding-bottom: 12px; margin-bottom: 20px; page-break-after: avoid; break-after: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="font-size: 22px; font-weight: 700; color: #276DC3; margin: 0 0 6px 0; letter-spacing: -0.3px;">${esc(title)}</h1>
            ${author ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #57606a;"><strong>Autor:</strong> ${esc(author)}</p>` : ''}
            <p style="margin: 0; font-size: 11px; color: #6e7781;">Gerado em: ${new Date().toLocaleString('pt-BR')} · RStation Web (webR WASM)</p>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 14px; font-weight: 700; color: #276DC3; font-family: 'JetBrains Mono', monospace;">RStation Web</span>
          </div>
        </div>
      </div>
    `;
    container.innerHTML = headerHtml;

    // 1. Scripts R
    if (opts && opts.includeScripts && scripts.length) {
      var scriptsSec = document.createElement("div");
      scriptsSec.style.cssText = "margin-bottom: 24px;";
      var sHtml = `<h2 style="font-size: 15px; font-weight: 600; color: #24292f; border-bottom: 1px solid #d0d7de; padding-bottom: 4px; margin-bottom: 12px; page-break-after: avoid; break-after: avoid;">1. Scripts R</h2>`;
      scripts.forEach(function (s) {
        sHtml += `
          <div style="margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; -webkit-column-break-inside: avoid;">
            <div style="font-size: 12px; font-weight: 600; color: #57606a; margin-bottom: 4px; font-family: 'JetBrains Mono', monospace;">📄 ${esc(s.name)}</div>
            <pre style="background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 10px; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 10.5px; line-height: 1.45; overflow: hidden; white-space: pre-wrap; word-break: break-word; margin: 0; color: #24292f;">${esc(s.content)}</pre>
          </div>
        `;
      });
      scriptsSec.innerHTML = sHtml;
      container.appendChild(scriptsSec);
    }

    // 2. Gráficos
    if (opts && opts.includePlots && plots.length) {
      var plotsSec = document.createElement("div");
      plotsSec.style.cssText = "margin-bottom: 24px;";
      var pHtml = `<h2 style="font-size: 15px; font-weight: 600; color: #24292f; border-bottom: 1px solid #d0d7de; padding-bottom: 4px; margin-bottom: 12px; page-break-after: avoid; break-after: avoid;">2. Gráficos e Visualizações</h2><div style="display: flex; flex-direction: column; gap: 16px;">`;
      plots.forEach(function (p) {
        pHtml += `
          <div style="text-align: center; border: 1px solid #d0d7de; border-radius: 6px; padding: 14px; background: #ffffff; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; -webkit-column-break-inside: avoid;">
            <img src="${p.dataUrl}" alt="Gráfico ${p.index}" style="max-width: 100%; max-height: 320px; width: auto; height: auto; display: block; margin: 0 auto;" />
            <div style="font-size: 11px; color: #57606a; margin-top: 8px; font-weight: 500;">Figura ${p.index} — Gráfico gerado na sessão R</div>
          </div>
        `;
      });
      pHtml += `</div>`;
      plotsSec.innerHTML = pHtml;
      container.appendChild(plotsSec);
    }

    // 3. Console Output
    if (opts && opts.includeConsole && consoleText.trim()) {
      var consoleSec = document.createElement("div");
      consoleSec.style.cssText = "margin-bottom: 24px; page-break-inside: avoid; break-inside: avoid; -webkit-column-break-inside: avoid;";
      consoleSec.innerHTML = `
        <h2 style="font-size: 15px; font-weight: 600; color: #24292f; border-bottom: 1px solid #d0d7de; padding-bottom: 4px; margin-bottom: 12px; page-break-after: avoid; break-after: avoid;">3. Saída do Console R</h2>
        <pre style="background: #0d1117; color: #e6edf3; border: 1px solid #30363d; border-radius: 6px; padding: 12px; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 10px; line-height: 1.45; overflow: hidden; white-space: pre-wrap; word-break: break-word; margin: 0;">${esc(consoleText)}</pre>
      `;
      container.appendChild(consoleSec);
    }

    // Footer
    var footerEl = document.createElement("div");
    footerEl.style.cssText = "border-top: 1px solid #d0d7de; padding-top: 8px; margin-top: 24px; font-size: 10px; color: #8c959f; display: flex; justify-content: space-between; page-break-inside: avoid; break-inside: avoid;";
    footerEl.innerHTML = `<span>RStation Web · Análise Reproduzível</span><span>Página gerada via WebAssembly</span>`;
    container.appendChild(footerEl);

    return container;
  }

  function waitForPreviewReady(root) {
    var imgs = Array.prototype.slice.call(root.querySelectorAll("img"));
    var imgWait = Promise.all(imgs.map(function (img) {
      if (img.complete && img.naturalWidth) {
        return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
      }
      return new Promise(function (resolve) {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }));
    return imgWait.then(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () {
          requestAnimationFrame(resolve);
        });
      });
    });
  }

  function mountReportCaptureHost(reportEl) {
    var host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.setAttribute("data-webr-pdf-capture", "1");
    host.style.cssText = [
      "position:fixed",
      "left:0",
      "top:0",
      "width:780px",
      "height:auto",
      "overflow:visible",
      "border:0",
      "opacity:1",
      "visibility:visible",
      "background:#ffffff",
      "color:#1f2328",
      "color-scheme:light",
      "pointer-events:none",
      "z-index:1"
    ].join(";");
    reportEl.style.position = "relative";
    reportEl.style.left = "auto";
    reportEl.style.top = "auto";
    reportEl.style.width = "780px";
    reportEl.style.maxWidth = "780px";
    reportEl.style.margin = "0";
    reportEl.style.opacity = "1";
    reportEl.style.visibility = "visible";
    reportEl.style.zIndex = "auto";
    reportEl.style.background = "#ffffff";
    host.appendChild(reportEl);
    document.body.appendChild(host);
    return host;
  }

  function reportCanvasOptions(height) {
    return {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 780,
      windowHeight: height,
      onclone: function (clonedDoc) {
        var clonedRoot = clonedDoc.querySelector(".webr-pdf-document") || clonedDoc.body;
        if (!clonedRoot) return;
        clonedRoot.style.opacity = "1";
        clonedRoot.style.visibility = "visible";
        clonedRoot.style.background = "#ffffff";
        clonedRoot.style.position = "relative";
        clonedRoot.style.left = "auto";
        clonedRoot.style.top = "auto";
        clonedRoot.style.zIndex = "auto";
      }
    };
  }

  async function exportPdfReport() {
    var titleInp = document.getElementById("pdf-report-title");
    var authorInp = document.getElementById("pdf-report-author");
    var incScripts = document.getElementById("pdf-inc-scripts") ? document.getElementById("pdf-inc-scripts").checked : true;
    var incPlots = document.getElementById("pdf-inc-plots") ? document.getElementById("pdf-inc-plots").checked : true;
    var incConsole = document.getElementById("pdf-inc-console") ? document.getElementById("pdf-inc-console").checked : true;

    var btn = document.getElementById("btn-confirm-report-pdf");
    var origText = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Gerando PDF...';
    }

    var host = null;
    try {
      if (typeof html2canvas === "undefined") {
        throw new Error("Biblioteca html2canvas não encontrada.");
      }
      var JsPdfClass = null;
      if (typeof window.jspdf !== "undefined" && window.jspdf.jsPDF) {
        JsPdfClass = window.jspdf.jsPDF;
      } else if (typeof jsPDF !== "undefined") {
        JsPdfClass = jsPDF;
      } else {
        throw new Error("Biblioteca jsPDF não encontrada.");
      }

      var reportEl = buildReportDocument({
        title: titleInp ? titleInp.value.trim() : "Relatório de Análise — RStation Web",
        author: authorInp ? authorInp.value.trim() : "",
        includeScripts: incScripts,
        includePlots: incPlots,
        includeConsole: incConsole
      });

      host = mountReportCaptureHost(reportEl);
      await waitForPreviewReady(reportEl);

      var safeTitle = (titleInp && titleInp.value.trim()) ? titleInp.value.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "_") : "webr_relatorio";
      var filename = safeTitle + "_" + Date.now() + ".pdf";

      var pdf = new JsPdfClass({
        orientation: "p",
        unit: "mm",
        format: "a4",
        compress: true
      });

      // Tentar usar o renderizador inteligente de HTML do jsPDF com detecção de quebra de página
      var usedNativeHtml = false;
      if (typeof pdf.html === "function") {
        try {
          await new Promise(function (resolve, reject) {
            pdf.html(reportEl, {
              x: 10,
              y: 10,
              width: 190,
              windowWidth: 780,
              autoPaging: "text",
              html2canvas: {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: "#ffffff"
              },
              callback: function (doc) {
                try {
                  doc.save(filename);
                  resolve();
                } catch (e) {
                  reject(e);
                }
              }
            }).catch(reject);
          });
          usedNativeHtml = true;
        } catch (htmlErr) {
          console.warn("Falha no pdf.html nativo, aplicando fallback por canvas:", htmlErr);
          usedNativeHtml = false;
        }
      }

      if (!usedNativeHtml) {
        var pageHeight = Math.max(reportEl.scrollHeight, reportEl.offsetHeight, host.scrollHeight, 400);
        host.style.height = pageHeight + "px";
        var canvas = await html2canvas(reportEl, reportCanvasOptions(pageHeight));

        if (!canvas || canvas.width < 10 || canvas.height < 10) {
          throw new Error("Falha na renderização gráfica do relatório.");
        }

        var imgData = canvas.toDataURL("image/jpeg", 0.95);
        var fallbackPdf = new JsPdfClass("p", "mm", "a4");

        var pdfWidth = 210;
        var pdfHeight = 297;
        var marginX = 10;
        var marginY = 10;
        var contentWidth = pdfWidth - (marginX * 2);
        var contentHeight = (canvas.height * contentWidth) / canvas.width;

        var heightLeft = contentHeight;
        var positionY = marginY;

        fallbackPdf.addImage(imgData, "JPEG", marginX, positionY, contentWidth, contentHeight);
        heightLeft -= (pdfHeight - (marginY * 2));

        while (heightLeft > 0) {
          positionY = marginY - (contentHeight - heightLeft);
          fallbackPdf.addPage();
          fallbackPdf.addImage(imgData, "JPEG", marginX, positionY, contentWidth, contentHeight);
          heightLeft -= (pdfHeight - (marginY * 2));
        }

        fallbackPdf.save(filename);
      }


      closeReportPdfModal();
      if (ctx.showToast) ctx.showToast("Relatório PDF baixado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      if (ctx.showToast) ctx.showToast("Falha ao gerar PDF: " + err.message, "error");
    } finally {
      if (host && host.parentNode) {
        host.parentNode.removeChild(host);
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }
  }

  function printReport() {
    var titleInp = document.getElementById("pdf-report-title");
    var authorInp = document.getElementById("pdf-report-author");
    var incScripts = document.getElementById("pdf-inc-scripts") ? document.getElementById("pdf-inc-scripts").checked : true;
    var incPlots = document.getElementById("pdf-inc-plots") ? document.getElementById("pdf-inc-plots").checked : true;
    var incConsole = document.getElementById("pdf-inc-console") ? document.getElementById("pdf-inc-console").checked : true;

    var doc = buildReportDocument({
      title: titleInp ? titleInp.value.trim() : "Relatório RStation Web",
      author: authorInp ? authorInp.value.trim() : "",
      includeScripts: incScripts,
      includePlots: incPlots,
      includeConsole: incConsole
    });

    var win = window.open("", "_blank");
    if (!win) {
      if (ctx.showToast) ctx.showToast("Permita pop-ups para imprimir.", "error");
      return;
    }
    win.document.write("<!DOCTYPE html><html><head><title>" + esc(titleInp ? titleInp.value : "Relatório RStation Web") + "</title>");
    win.document.write("<style>body{margin:0;padding:20px;}@media print{@page{margin:15mm;}}</style></head><body>");
    win.document.write(doc.outerHTML);
    win.document.write("<script>setTimeout(function(){window.print();},400);</script></body></html>");
    win.document.close();
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
      "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='utf-8'/><title>Relatório RStation Web</title>" +
      "<style>body{font-family:Inter,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;line-height:1.5}" +
      "pre{background:#f6f8fa;padding:1rem;overflow:auto;border-radius:6px;font-size:0.85rem}" +
      "figure{margin:1.5rem 0;text-align:center}figcaption{color:#666;font-size:0.85rem}" +
      "h1{color:#276DC3}.console{background:#0d1117;color:#c9d1d9;padding:1rem;border-radius:6px;white-space:pre-wrap;font-size:0.8rem}</style></head><body>" +
      "<h1>Relatório RStation Web</h1><p>Gerado em " + new Date().toLocaleString("pt-BR") + "</p>" +
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
    document.getElementById("btn-url-import")?.addEventListener("click", fetchUrlData);
    document.getElementById("excel-file-picker")?.addEventListener("change", function (e) {
      if (e.target.files[0]) onExcelFileSelected(e.target.files[0]);
    });
    document.getElementById("excel-sheet-select")?.addEventListener("change", function (e) {
      previewExcelSheet(e.target.value);
    });
    document.getElementById("btn-excel-confirm")?.addEventListener("click", confirmExcelImport);
    document.getElementById("btn-excel-cancel")?.addEventListener("click", function () {
      document.getElementById("modal-excel-import").classList.remove("show");
      pendingExcel = null;
    });
    document.getElementById("btn-share-link")?.addEventListener("click", generateShareLink);
    document.getElementById("btn-copy-share-link")?.addEventListener("click", function () {
      var out = document.getElementById("share-link-output");
      navigator.clipboard.writeText(out.value);
      if (ctx.showToast) ctx.showToast("Link copiado!");
    });
    document.getElementById("btn-close-share")?.addEventListener("click", function () {
      document.getElementById("modal-share").classList.remove("show");
    });

    // Report PDF / HTML events
    document.getElementById("btn-export-report")?.addEventListener("click", openReportPdfModal);
    document.getElementById("btn-close-report-pdf")?.addEventListener("click", closeReportPdfModal);
    document.getElementById("btn-cancel-report-pdf")?.addEventListener("click", closeReportPdfModal);
    document.getElementById("btn-confirm-report-pdf")?.addEventListener("click", exportPdfReport);
    document.getElementById("btn-print-report")?.addEventListener("click", printReport);
    document.getElementById("btn-export-report-html")?.addEventListener("click", exportHtmlReport);

    document.getElementById("btn-save-session")?.addEventListener("click", saveSession);
    document.getElementById("session-file-picker")?.addEventListener("change", function (e) {
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
    getAllScripts: getAllScripts,
    getActiveScriptName: getActiveScriptName,
    openReportPdfModal: openReportPdfModal,
    exportPdfReport: exportPdfReport
  };
})();
