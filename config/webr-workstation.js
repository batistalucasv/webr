/**
 * Estação webR: upload de ficheiros para o filesystem do webR (v0.3.0).
 * Bootstrap alinhado ao padrão estável de config/fito-upload.js.
 */
(function () {
  var WEBR_STATION_VERSION = "0.3.0";
  var UPLOAD_DIR = "/home/web_user/uploads";
  var uploaded = [];
  var ready = false;
  var uploading = false;

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatBytes(n) {
    var b = Number(n) || 0;
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    return (b / (1024 * 1024)).toFixed(1) + " MB";
  }

  function setStatus(msg, isError) {
    var el = document.getElementById("webr-upload-status");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("webr-upload-error", !!isError);
    el.classList.toggle("webr-upload-ok", !isError && !!msg);
  }

  function setControlsEnabled(enabled) {
    var input = document.getElementById("webr-file-input");
    var btn = document.getElementById("webr-upload-btn");
    var clearBtn = document.getElementById("webr-upload-clear");
    var zone = document.getElementById("webr-dropzone");
    if (input) input.disabled = !enabled || uploading;
    if (btn) btn.disabled = !enabled || uploading;
    if (clearBtn) clearBtn.disabled = !enabled || uploading;
    if (zone) {
      zone.classList.toggle("webr-dropzone-disabled", !enabled || uploading);
      zone.setAttribute("aria-disabled", !enabled || uploading ? "true" : "false");
    }
  }

  function renderList() {
    var box = document.getElementById("webr-upload-list");
    if (!box) return;
    if (!uploaded.length) {
      box.innerHTML =
        '<p class="webr-upload-empty"><em>Nenhum arquivo no webR ainda.</em></p>';
      return;
    }
    var html = '<ul class="webr-upload-files">';
    uploaded.forEach(function (f, idx) {
      html +=
        '<li><button type="button" class="webr-upload-path" data-idx="' +
        idx +
        '" title="Clique para copiar o caminho">' +
        "<code>" +
        esc(f.path) +
        "</code></button> " +
        '<span class="webr-upload-meta">(' +
        esc(f.name) +
        ", " +
        formatBytes(f.size) +
        ")</span></li>";
    });
    html += "</ul>";
    html +=
      '<p class="webr-upload-hint">No R: <code>list.files("' +
      UPLOAD_DIR +
      '", full.names = TRUE)</code>' +
      (uploaded[0]
        ? ' · exemplo: <code>read.csv("' + esc(uploaded[0].path) + '")</code>'
        : "") +
      ". Clique num caminho para copiar.</p>";
    box.innerHTML = html;
  }

  async function waitWebR() {
    var deadline = Date.now() + 120000;
    while (!globalThis.qwebrInstance) {
      if (Date.now() > deadline) {
        throw new Error("webR não iniciou a tempo. Recarregue a página.");
      }
      await new Promise(function (r) {
        setTimeout(r, 200);
      });
    }
    await globalThis.qwebrInstance;
    if (!globalThis.mainWebR) {
      throw new Error("webR iniciou sem mainWebR. Recarregue a página.");
    }
    // Igual ao fito: reforça o proxy FS no canal PostMessage.
    await mainWebR.init();
  }

  async function ensureUploadDir() {
    await mainWebR.evalRVoid(
      'dir.create("' +
        UPLOAD_DIR +
        '", recursive = TRUE, showWarnings = FALSE)'
    );
  }

  function safeName(name) {
    return (
      String(name || "arquivo")
        .replace(/[\\/]+/g, "_")
        .replace(/[<>:"|?*\u0000-\u001f]+/g, "_")
        .replace(/^\.+/, "")
        .slice(0, 120) || "arquivo"
    );
  }

  async function pathExists(path) {
    try {
      if (mainWebR.FS && typeof mainWebR.FS.analyzePath === "function") {
        var info = await mainWebR.FS.analyzePath(path);
        return !!(info && info.exists);
      }
    } catch (_) {
      /* fallback abaixo */
    }
    try {
      await mainWebR.FS.lookupPath(path);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function uniquePath(baseName) {
    var name = safeName(baseName);
    var path = UPLOAD_DIR + "/" + name;
    var used = {};
    uploaded.forEach(function (f) {
      used[f.path] = true;
    });
    if (!used[path] && !(await pathExists(path))) return path;
    var dot = name.lastIndexOf(".");
    var stem = dot > 0 ? name.slice(0, dot) : name;
    var ext = dot > 0 ? name.slice(dot) : "";
    var n = 2;
    while (true) {
      var candidate = UPLOAD_DIR + "/" + stem + "_" + n + ext;
      if (!used[candidate] && !(await pathExists(candidate))) return candidate;
      n += 1;
      if (n > 9999) throw new Error("Não foi possível gerar nome único para " + name);
    }
  }

  function readFileAsUint8Array(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(new Uint8Array(reader.result));
      };
      reader.onerror = function () {
        reject(new Error("Falha ao ler " + file.name));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async function verifyWritten(path, expectedSize) {
    if (await pathExists(path)) return true;
    try {
      var bytes = await mainWebR.FS.readFile(path);
      return bytes && bytes.length === expectedSize;
    } catch (_) {
      return false;
    }
  }

  async function uploadFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) {
      setStatus("Selecione um ou mais arquivos.", true);
      return;
    }
    uploading = true;
    setControlsEnabled(false);
    try {
      setStatus("Preparando webR…");
      await waitWebR();
      await ensureUploadDir();

      var ok = 0;
      var failed = [];
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        setStatus("Enviando " + (i + 1) + "/" + files.length + ": " + file.name);
        try {
          var bytes = await readFileAsUint8Array(file);
          var path = await uniquePath(file.name);
          await mainWebR.FS.writeFile(path, bytes);
          var okWrite = await verifyWritten(path, bytes.length);
          if (!okWrite) {
            throw new Error("Arquivo não apareceu no filesystem do webR.");
          }
          uploaded.push({ name: file.name, path: path, size: bytes.length });
          ok += 1;
        } catch (err) {
          console.error(err);
          failed.push(file.name + ": " + (err && err.message ? err.message : String(err)));
        }
      }

      renderList();
      if (ok && !failed.length) {
        setStatus(ok + " arquivo(s) disponível(is) em " + UPLOAD_DIR + ".");
      } else if (ok && failed.length) {
        setStatus(
          ok + " enviado(s); falha em " + failed.length + ". " + failed.join(" · "),
          true
        );
      } else {
        setStatus("Nenhum arquivo enviado. " + failed.join(" · "), true);
      }
    } catch (err) {
      console.error(err);
      setStatus(err && err.message ? err.message : String(err), true);
    } finally {
      uploading = false;
      setControlsEnabled(ready);
      var input = document.getElementById("webr-file-input");
      if (input) input.value = "";
    }
  }

  async function clearUploads() {
    if (!ready) {
      setStatus("Aguarde o webR iniciar…", true);
      return;
    }
    uploading = true;
    setControlsEnabled(false);
    try {
      setStatus("Removendo arquivos do webR…");
      await waitWebR();
      await ensureUploadDir();

      var paths = uploaded.map(function (f) {
        return f.path;
      });
      for (var i = 0; i < paths.length; i++) {
        try {
          await mainWebR.FS.unlink(paths[i]);
        } catch (err) {
          console.warn("webr-station: unlink", paths[i], err);
        }
      }

      // Limpa restos na pasta (ex.: uploads de sessões anteriores na mesma aba).
      try {
        await mainWebR.evalRVoid(
          'if (dir.exists("' +
            UPLOAD_DIR +
            '")) {' +
            '  fs <- list.files("' +
            UPLOAD_DIR +
            '", full.names = TRUE, all.files = FALSE, recursive = FALSE);' +
            "  if (length(fs)) unlink(fs, recursive = FALSE, force = TRUE)" +
            "}"
        );
      } catch (err) {
        console.warn("webr-station: limpeza R", err);
      }

      uploaded = [];
      renderList();
      setStatus("Uploads removidos de " + UPLOAD_DIR + ".");
    } catch (err) {
      console.error(err);
      setStatus(err && err.message ? err.message : String(err), true);
    } finally {
      uploading = false;
      setControlsEnabled(ready);
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function markReady() {
    ready = true;
    setControlsEnabled(true);
    setStatus("webR pronto. Arraste arquivos para a área ou escolha no botão.");
  }

  function watchReady() {
    setControlsEnabled(false);
    setStatus("Aguarde o webR iniciar…");
    waitWebR()
      .then(function () {
        return ensureUploadDir();
      })
      .then(markReady)
      .catch(function (err) {
        console.error(err);
        setStatus(err && err.message ? err.message : String(err), true);
        setControlsEnabled(false);
      });
  }

  function bindUi() {
    var input = document.getElementById("webr-file-input");
    var btn = document.getElementById("webr-upload-btn");
    var clearBtn = document.getElementById("webr-upload-clear");
    var zone = document.getElementById("webr-dropzone");
    var list = document.getElementById("webr-upload-list");
    if (!input || !btn) return;

    document.body.classList.add("webr-station");
    document.documentElement.setAttribute("data-webr-station", WEBR_STATION_VERSION);

    btn.addEventListener("click", function () {
      if (input.files && input.files.length) {
        uploadFiles(input.files);
      } else {
        input.click();
      }
    });

    input.addEventListener("change", function () {
      if (!input.files || !input.files.length) return;
      uploadFiles(input.files);
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        clearUploads();
      });
    }

    if (zone) {
      zone.addEventListener("click", function (ev) {
        if (zone.classList.contains("webr-dropzone-disabled")) return;
        if (ev.target && ev.target.closest && ev.target.closest("button, a, label")) return;
        input.click();
      });
      zone.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          if (!zone.classList.contains("webr-dropzone-disabled")) input.click();
        }
      });
      ["dragenter", "dragover"].forEach(function (type) {
        zone.addEventListener(type, function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (!zone.classList.contains("webr-dropzone-disabled")) {
            zone.classList.add("webr-dropzone-active");
          }
        });
      });
      ["dragleave", "dragend"].forEach(function (type) {
        zone.addEventListener(type, function (ev) {
          ev.preventDefault();
          zone.classList.remove("webr-dropzone-active");
        });
      });
      zone.addEventListener("drop", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        zone.classList.remove("webr-dropzone-active");
        if (zone.classList.contains("webr-dropzone-disabled")) return;
        var files = ev.dataTransfer && ev.dataTransfer.files;
        if (files && files.length) uploadFiles(files);
      });
    }

    if (list) {
      list.addEventListener("click", function (ev) {
        var btnPath = ev.target && ev.target.closest && ev.target.closest(".webr-upload-path");
        if (!btnPath) return;
        var idx = Number(btnPath.getAttribute("data-idx"));
        var item = uploaded[idx];
        if (!item) return;
        copyText(item.path)
          .then(function () {
            setStatus("Caminho copiado: " + item.path);
          })
          .catch(function () {
            setStatus("Não foi possível copiar. Selecione o caminho manualmente.", true);
          });
      });
    }

    renderList();
    watchReady();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindUi);
  } else {
    bindUi();
  }
})();
