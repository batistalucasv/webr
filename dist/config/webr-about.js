/**
 * RStation Web — Sobre (About): version + changelog
 *
 * Changelog process for maintainers:
 * Add at most one entry per calendar day. Prefer a new { date, notes } object
 * rather than rewriting an older day. Keep notes short (one or two lines).
 */
(function () {
  var PRODUCT_NAME = "RStation Web";
  var VERSION = "0.1.0 beta";

  // At most one changelog entry per calendar day.
  var CHANGELOG = [
    {
      date: "2026-08-19",
      notes: "Primeira versão pública 0.1.0 beta."
    }
  ];

  var COPY = {
    pt: {
      menu: "Sobre",
      changelog: "Changelog",
      changelogTitle: "Changelog",
      close: "Fechar"
    },
    en: {
      menu: "About",
      changelog: "Changelog",
      changelogTitle: "Changelog",
      close: "Close"
    }
  };

  function currentLang() {
    try {
      var saved = localStorage.getItem("rstation-lang");
      if (saved === "en" || saved === "pt") return saved;
    } catch (e) { /* ignore */ }
    var htmlLang = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    if (htmlLang.indexOf("en") === 0) return "en";
    return "pt";
  }

  function copy() {
    return COPY[currentLang()] || COPY.pt;
  }

  function findShareMenu(nav) {
    var wraps = nav.querySelectorAll(".header-menu-static");
    for (var i = 0; i < wraps.length; i++) {
      var trigger = wraps[i].querySelector(".menubar-item");
      if (!trigger) continue;
      var label = (trigger.textContent || "").trim();
      if (/^Compartilhar$/i.test(label) || /^Share$/i.test(label)) return wraps[i];
    }
    return null;
  }

  function injectMenu() {
    var nav = document.querySelector(".header-menubar");
    if (!nav || document.getElementById("menu-about-wrap")) return;

    var strings = copy();
    var wrap = document.createElement("div");
    wrap.className = "dropdown header-menu-about";
    wrap.id = "menu-about-wrap";
    wrap.innerHTML =
      '<button type="button" class="menubar-item" id="menu-about-trigger">' +
        strings.menu +
      "</button>" +
      '<div class="dropdown-menu menubar-about-menu" id="menu-about-panel" role="menu">' +
        '<div class="about-panel">' +
          '<p class="about-product">' + PRODUCT_NAME + "</p>" +
          '<p class="about-version" id="about-version-label">' + VERSION + "</p>" +
          '<button type="button" class="dropdown-item about-changelog-btn" id="menu-changelog">' +
            '<i class="bi bi-journal-text"></i> ' + strings.changelog +
          "</button>" +
        "</div>" +
      "</div>";

    var shareWrap = findShareMenu(nav);
    if (shareWrap) {
      shareWrap.insertAdjacentElement("afterend", wrap);
    } else {
      nav.appendChild(wrap);
    }
  }

  function formatDate(iso) {
    var parts = String(iso).split("-");
    if (parts.length !== 3) return iso;
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function changelogHtml() {
    return CHANGELOG.map(function (entry) {
      return (
        "<li class=\"about-changelog-item\">" +
          "<time datetime=\"" + entry.date + "\">" + formatDate(entry.date) + "</time>" +
          "<p>" + entry.notes + "</p>" +
        "</li>"
      );
    }).join("");
  }

  function injectModal() {
    if (document.getElementById("modal-changelog")) return;
    var strings = copy();
    var modal = document.createElement("div");
    modal.id = "modal-changelog";
    modal.className = "modal-backdrop";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-labelledby", "changelog-modal-title");
    modal.innerHTML =
      '<div class="modal-dialog modal-dialog-about">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title" id="changelog-modal-title">' +
            '<i class="bi bi-journal-text"></i> ' + strings.changelogTitle +
          "</h3>" +
          '<button type="button" class="btn btn-icon btn-sm" id="btn-close-changelog" aria-label="' +
            strings.close + '">&times;</button>' +
        "</div>" +
        '<div class="modal-body">' +
          '<p class="about-changelog-product">' + PRODUCT_NAME + " " + VERSION + "</p>" +
          '<ol class="about-changelog-list">' + changelogHtml() + "</ol>" +
        "</div>" +
      "</div>";
    document.body.appendChild(modal);
  }

  function closeMenubar() {
    document.querySelectorAll(".header-menubar .dropdown-menu.show").forEach(function (m) {
      m.classList.remove("show");
      m.classList.remove("menubar-drop-right");
    });
  }

  function openChangelog() {
    var modal = document.getElementById("modal-changelog");
    if (!modal) return;
    closeMenubar();
    modal.classList.add("show");
  }

  function closeChangelog() {
    var modal = document.getElementById("modal-changelog");
    if (modal) modal.classList.remove("show");
  }

  function bindAboutMenu() {
    var wrap = document.getElementById("menu-about-wrap");
    if (!wrap || wrap.getAttribute("data-about-bound") === "1") return;
    wrap.setAttribute("data-about-bound", "1");
    var trigger = wrap.querySelector(".menubar-item");
    var menu = wrap.querySelector(".dropdown-menu");
    if (!trigger || !menu) return;

    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = menu.classList.contains("show");
      document.querySelectorAll(".header-menubar .dropdown-menu.show").forEach(function (m) {
        m.classList.remove("show");
        m.classList.remove("menubar-drop-right");
      });
      if (!open) menu.classList.add("show");
    });
  }

  function bindUi() {
    bindAboutMenu();
    var changelogBtn = document.getElementById("menu-changelog");
    if (changelogBtn) {
      changelogBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        openChangelog();
      });
    }

    var closeBtn = document.getElementById("btn-close-changelog");
    if (closeBtn) closeBtn.addEventListener("click", closeChangelog);

    var modal = document.getElementById("modal-changelog");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeChangelog();
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeChangelog();
    });
  }

  function init() {
    injectMenu();
    injectModal();
    bindUi();
  }

  // Insert the menubar item as soon as this classic script runs (header is
  // already in the DOM). Bindings run on DOMContentLoaded.
  injectMenu();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.webr2About = {
    PRODUCT_NAME: PRODUCT_NAME,
    VERSION: VERSION,
    CHANGELOG: CHANGELOG,
    init: init,
    openChangelog: openChangelog,
    closeChangelog: closeChangelog
  };
})();
