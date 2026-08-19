/**
 * webr — Análise de dados: CSV wizard, skim, grid editável
 */
(function () {
  var ctx = {};
  var csvState = { file: null, buffer: null, text: "" };
  var gridDirty = false;

  function on(id, ev, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(ev, fn);
  }

  function showModal(id, on) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle("show", !!on);
  }

  function rNameFromFile(name) {
    var base = String(name || "dados").replace(/\.[^.]+$/, "");
    base = base.replace(/[^A-Za-z0-9._]/g, "_");
    if (!/^[A-Za-z.]/.test(base)) base = "d_" + base;
    return base || "dados";
  }

  function decodeBuffer(buffer, encoding) {
    try {
      return new TextDecoder(encoding, { fatal: false }).decode(buffer);
    } catch (_) {
      return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    }
  }

  function replacementCount(text) {
    return (text.match(/\uFFFD/g) || []).length;
  }

  function detectEncoding(buffer) {
    var utf = decodeBuffer(buffer, "utf-8");
    var win = decodeBuffer(buffer, "windows-1252");
    if (replacementCount(utf) > 0 && replacementCount(win) === 0) return "windows-1252";
    if (/Ã.|Â./.test(utf) && !/Ã.|Â./.test(win)) return "windows-1252";
    return "utf-8";
  }

  function detectSep(text) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); }).slice(0, 10);
    if (!lines.length) return ",";
    var seps = [";", ",", "\t", "|"];
    var best = ",";
    var bestScore = -1;
    seps.forEach(function (sep) {
      var counts = lines.map(function (l) { return l.split(sep).length; });
      var first = counts[0];
      if (first < 2) return;
      var same = counts.filter(function (c) { return c === first; }).length;
      var score = same * first;
      if (score > bestScore) {
        bestScore = score;
        best = sep;
      }
    });
    return best;
  }

  function detectDec(text, sep) {
    if (sep === ";") return ",";
    var commaNum = (text.match(/\d,\d/g) || []).length;
    var dotNum = (text.match(/\d\.\d/g) || []).length;
    if (commaNum > dotNum * 2) return ",";
    return ".";
  }

  function splitCsvLine(line, sep) {
    var out = [];
    var cur = "";
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === sep && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function previewCsv(text, sep, header) {
    var lines = text.split(/\r?\n/).filter(function (l, i, arr) {
      return l.length || i < arr.length - 1;
    });
    var rows = [];
    for (var i = 0; i < lines.length && rows.length < 8; i++) {
      if (!lines[i] && i === lines.length - 1) continue;
      rows.push(splitCsvLine(lines[i], sep));
    }
    return rows;
  }

  function renderCsvPreview() {
    var sep = document.getElementById("csv-sep").value;
    if (sep === "\\t") sep = "\t";
    var header = document.getElementById("csv-header").value === "true";
    var encoding = document.getElementById("csv-encoding").value;
    csvState.text = decodeBuffer(csvState.buffer, encoding);
    var rows = previewCsv(csvState.text, sep, header);
    var host = document.getElementById("csv-wizard-preview");
    if (!rows.length) {
      host.innerHTML = "<p>Arquivo vazio.</p>";
      return;
    }
    var html = "<table><thead><tr>";
    var start = header ? 1 : 0;
    var cols = rows[0].length;
    for (var c = 0; c < cols; c++) {
      html += "<th>" + (header ? esc(rows[0][c] || "V" + (c + 1)) : "V" + (c + 1)) + "</th>";
    }
    html += "</tr></thead><tbody>";
    var body = header ? rows.slice(1) : rows;
    body.forEach(function (r) {
      html += "<tr>";
      for (var c = 0; c < cols; c++) html += "<td>" + esc(r[c] || "") + "</td>";
      html += "</tr>";
    });
    html += "</tbody></table>";
    host.innerHTML = html;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function openCsvWizard(file) {
    csvState.file = file;
    csvState.buffer = await file.arrayBuffer();
    var enc = detectEncoding(csvState.buffer);
    csvState.text = decodeBuffer(csvState.buffer, enc);
    var sep = detectSep(csvState.text);
    var dec = detectDec(csvState.text, sep);
    document.getElementById("csv-wizard-filename").textContent = file.name + " · " + (file.size / 1024).toFixed(1) + " KB";
    document.getElementById("csv-obj-name").value = rNameFromFile(file.name);
    document.getElementById("csv-encoding").value = enc;
    document.getElementById("csv-sep").value = sep === "\t" ? "\\t" : sep;
    document.getElementById("csv-dec").value = dec;
    document.getElementById("csv-header").value = "true";
    renderCsvPreview();
    showModal("modal-csv-wizard", true);
    if (ctx.switchTab) ctx.switchTab("files");
  }

  async function loadCsvIntoR() {
    if (!csvState.buffer || !ctx.getWebR) return;
    var webR = ctx.getWebR();
    if (!webR) {
      ctx.showToast("Aguarde o RStation Web inicializar...", "error");
      return;
    }
    var encoding = document.getElementById("csv-encoding").value;
    var sep = document.getElementById("csv-sep").value;
    if (sep === "\\t") sep = "\t";
    var dec = document.getElementById("csv-dec").value;
    var header = document.getElementById("csv-header").value === "true";
    var obj = document.getElementById("csv-obj-name").value.trim() || "dados";
    obj = rNameFromFile(obj);
    var text = decodeBuffer(csvState.buffer, encoding);
    var utf8 = new TextEncoder().encode(text);
    var clean = (csvState.file.name || "dados.csv").replace(/[^a-zA-Z0-9._-]/g, "_");
    var path = "/home/web_user/uploads/" + clean;
    await webR.FS.writeFile(path, utf8);
    if (ctx.registerUpload) {
      ctx.registerUpload({ name: clean, path: path, size: utf8.length });
    }
    var sepR = sep === "\t" ? "\\t" : sep;
    var code =
      obj +
      ' <- utils::read.csv("' +
      path +
      '", sep = "' +
      sepR +
      '", dec = "' +
      dec +
      '", header = ' +
      (header ? "TRUE" : "FALSE") +
      ', stringsAsFactors = FALSE, check.names = TRUE, na.strings = c("NA", "", "null", "NULL"))\n' +
      "print(utils::str(" + obj + "))";
    showModal("modal-csv-wizard", false);
    if (ctx.runRCode) await ctx.runRCode(code);
    if (ctx.loadDataFrameToGrid) await ctx.loadDataFrameToGrid(obj);
    if (ctx.showToast) ctx.showToast("CSV carregado como " + obj);
  }

  function quantile(sorted, p) {
    if (!sorted.length) return null;
    var idx = (sorted.length - 1) * p;
    var lo = Math.floor(idx);
    var hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
  }

  function computeSkim() {
    var grid = ctx.getGrid ? ctx.getGrid() : null;
    var host = document.getElementById("data-skim-table");
    var summary = document.getElementById("data-skim-summary");
    if (!grid || !grid.columns || !grid.columns.length) {
      if (summary) summary.textContent = "Selecione um DataFrame";
      if (host) host.innerHTML = "";
      return;
    }
    var n = grid.rawData.length;
    var nNaTotal = 0;
    var html =
      "<table class='skim-table'><thead><tr>" +
      "<th>Coluna</th><th>Tipo</th><th>n</th><th>NA</th><th>% NA</th><th>Únicos</th><th>Min</th><th>Mediana</th><th>Média</th><th>Max</th><th>Amostra</th>" +
      "</tr></thead><tbody>";
    grid.columns.forEach(function (col) {
      var vals = grid.rawData.map(function (r) { return r[col.name]; });
      var missing = vals.filter(function (v) { return v === null || v === undefined || v === ""; }).length;
      nNaTotal += missing;
      var present = vals.filter(function (v) { return v !== null && v !== undefined && v !== ""; });
      var unique = new Set(present.map(String)).size;
      var isNum = col.type === "numeric" || col.type === "integer" || col.type === "double";
      var min = "—", med = "—", mean = "—", max = "—", sample = "";
      if (isNum) {
        var nums = present.map(Number).filter(function (x) { return !isNaN(x); }).sort(function (a, b) { return a - b; });
        if (nums.length) {
          min = String(nums[0]);
          max = String(nums[nums.length - 1]);
          med = quantile(nums, 0.5).toPrecision(6).replace(/\.?0+$/, "");
          var avg = nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
          mean = avg.toPrecision(6).replace(/\.?0+$/, "");
        }
      } else {
        var freq = {};
        present.forEach(function (v) {
          var k = String(v);
          freq[k] = (freq[k] || 0) + 1;
        });
        sample = Object.keys(freq)
          .sort(function (a, b) { return freq[b] - freq[a]; })
          .slice(0, 3)
          .map(function (k) { return k + " (" + freq[k] + ")"; })
          .join(", ");
      }
      var pct = n ? ((missing / n) * 100).toFixed(1) : "0";
      html +=
        "<tr>" +
        "<td><strong>" + esc(col.name) + "</strong></td>" +
        "<td><code>" + esc(col.type) + "</code></td>" +
        "<td>" + n + "</td>" +
        "<td>" + missing + "</td>" +
        "<td>" + pct + "%</td>" +
        "<td>" + unique + "</td>" +
        "<td>" + esc(min) + "</td>" +
        "<td>" + esc(med) + "</td>" +
        "<td>" + esc(mean) + "</td>" +
        "<td>" + esc(max) + "</td>" +
        "<td class='skim-sample'>" + esc(sample) + "</td>" +
        "</tr>";
    });
    html += "</tbody></table>";
    host.innerHTML = html;
    var trunc = grid.totalRows && grid.totalRows > n ? " (amostra " + n + " de " + grid.totalRows + ")" : "";
    summary.textContent =
      grid.name + " · " + n + " linhas × " + grid.columns.length + " colunas · " + nNaTotal + " NA no total" + trunc;
  }

  function csvEscape(val) {
    var s = String(val);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  async function applyGridToR() {
    var grid = ctx.getGrid ? ctx.getGrid() : null;
    if (!grid || !grid.name || !grid.rawData.length) {
      ctx.showToast("Nenhum DataFrame no grid.", "error");
      return;
    }
    var webR = ctx.getWebR && ctx.getWebR();
    if (!webR) return;
    var cols = grid.columns.map(function (c) { return c.name; });
    var lines = [cols.map(csvEscape).join(",")];
    grid.rawData.forEach(function (row) {
      lines.push(
        cols
          .map(function (c) {
            var v = row[c];
            if (v === null || v === undefined || v === "NA") return "";
            return csvEscape(v);
          })
          .join(",")
      );
    });
    var path = "/tmp/webr_grid_apply.csv";
    await webR.FS.writeFile(path, new TextEncoder().encode(lines.join("\n")));
    var conv = grid.columns
      .map(function (c) {
        var nm = c.name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        if (c.type === "numeric" || c.type === "double") {
          return grid.name + '[["' + nm + '"]] <- suppressWarnings(as.numeric(' + grid.name + '[["' + nm + '"]]))';
        }
        if (c.type === "integer") {
          return grid.name + '[["' + nm + '"]] <- suppressWarnings(as.integer(' + grid.name + '[["' + nm + '"]]))';
        }
        if (c.type === "factor") {
          return grid.name + '[["' + nm + '"]] <- factor(' + grid.name + '[["' + nm + '"]])';
        }
        if (c.type === "logical") {
          return grid.name + '[["' + nm + '"]] <- as.logical(' + grid.name + '[["' + nm + '"]])';
        }
        if (c.type === "Date") {
          return grid.name + '[["' + nm + '"]] <- as.Date(' + grid.name + '[["' + nm + '"]])';
        }
        return grid.name + '[["' + nm + '"]] <- as.character(' + grid.name + '[["' + nm + '"]])';
      })
      .join("\n");
    var code =
      grid.name +
      ' <- utils::read.csv("' +
      path +
      '", stringsAsFactors = FALSE, check.names = FALSE, na.strings = c("", "NA"))\n' +
      conv +
      "\nutils::str(" +
      grid.name +
      ")";
    if (ctx.runRCode) await ctx.runRCode(code);
    gridDirty = false;
    if (ctx.loadDataFrameToGrid) await ctx.loadDataFrameToGrid(grid.name);
    if (ctx.showToast) ctx.showToast("Edições gravadas em " + grid.name);
  }

  function openTypeModal() {
    var grid = ctx.getGrid ? ctx.getGrid() : null;
    var sel = document.getElementById("col-type-name");
    if (!grid || !grid.columns.length) {
      ctx.showToast("Carregue um DataFrame primeiro.", "error");
      return;
    }
    sel.innerHTML = grid.columns
      .map(function (c) {
        return "<option value='" + esc(c.name) + "'>" + esc(c.name) + " (" + esc(c.type) + ")</option>";
      })
      .join("");
    showModal("modal-col-type", true);
  }

  async function applyColType() {
    var grid = ctx.getGrid ? ctx.getGrid() : null;
    if (!grid || !grid.name) return;
    var col = document.getElementById("col-type-name").value;
    var typ = document.getElementById("col-type-target").value;
    var fn = {
      character: "as.character",
      factor: "as.factor",
      numeric: "as.numeric",
      integer: "as.integer",
      logical: "as.logical",
      Date: "as.Date"
    }[typ] || "as.character";
    var code =
      grid.name +
      '[["' +
      col.replace(/"/g, '\\"') +
      '"]] <- ' +
      fn +
      "(" +
      grid.name +
      '[["' +
      col.replace(/"/g, '\\"') +
      '"]])\nutils::str(' +
      grid.name +
      ")";
    showModal("modal-col-type", false);
    if (ctx.runRCode) await ctx.runRCode(code);
    if (ctx.loadDataFrameToGrid) await ctx.loadDataFrameToGrid(grid.name);
  }

  function bindGridCells() {
    document.querySelectorAll(".grid-cell-edit").forEach(function (td) {
      td.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          td.blur();
        }
      });
      td.addEventListener("blur", function () {
        var grid = ctx.getGrid ? ctx.getGrid() : null;
        if (!grid) return;
        var idx = parseInt(td.getAttribute("data-row"), 10);
        var col = td.getAttribute("data-col");
        if (!grid.rawData[idx]) return;
        var raw = td.textContent.trim();
        var next = raw === "" || raw.toUpperCase() === "NA" ? null : raw;
        if (grid.rawData[idx][col] !== next) {
          grid.rawData[idx][col] = next;
          gridDirty = true;
          td.classList.add("grid-cell-dirty");
        }
      });
    });
  }

  function bindEvents() {
    on("csv-wizard-picker", "change", function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = "";
      if (f) openCsvWizard(f);
    });
    ["csv-encoding", "csv-sep", "csv-header"].forEach(function (id) {
      on(id, "change", renderCsvPreview);
    });
    on("btn-csv-wizard-close", "click", function () { showModal("modal-csv-wizard", false); });
    on("btn-csv-wizard-cancel", "click", function () { showModal("modal-csv-wizard", false); });
    on("btn-csv-wizard-load", "click", loadCsvIntoR);
    on("modal-csv-wizard", "click", function (e) {
      if (e.target.id === "modal-csv-wizard") showModal("modal-csv-wizard", false);
    });

    on("btn-apply-grid-r", "click", applyGridToR);
    on("btn-convert-col-type", "click", openTypeModal);
    on("btn-col-type-close", "click", function () { showModal("modal-col-type", false); });
    on("btn-col-type-cancel", "click", function () { showModal("modal-col-type", false); });
    on("btn-col-type-apply", "click", applyColType);
    on("modal-col-type", "click", function (e) {
      if (e.target.id === "modal-col-type") showModal("modal-col-type", false);
    });

    on("btn-toggle-skim", "click", function () {
      document.getElementById("data-skim-panel").classList.toggle("collapsed");
    });
  }

  window.webrAnalysis = {
    init: function (options) {
      ctx = options || {};
      bindEvents();
    },
    openCsvWizard: openCsvWizard,
    onGridLoaded: function () {
      gridDirty = false;
      computeSkim();
      var panel = document.getElementById("data-skim-panel");
      if (panel) panel.classList.remove("collapsed");
    },
    onGridRendered: function () {
      bindGridCells();
      computeSkim();
    }
  };
})();
