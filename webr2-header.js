/**
 * webr — Barra de menus e ações do App Header
 */
(function () {
  function clickEl(id) {
    var el = document.getElementById(id);
    if (el) el.click();
  }

  function positionMenubarDropdown(menu) {
    menu.classList.remove("menubar-drop-right");
    var margin = 8;
    var rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - margin) {
      menu.classList.add("menubar-drop-right");
      rect = menu.getBoundingClientRect();
    }
    if (rect.left < margin) {
      menu.classList.remove("menubar-drop-right");
    }
  }

  function bindMenubar() {
    document.querySelectorAll(".header-menubar .header-menu-static").forEach(function (wrap) {
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
        if (!open) {
          menu.classList.add("show");
          positionMenubarDropdown(menu);
        }
      });
    });

    document.addEventListener("click", function () {
      document.querySelectorAll(".header-menubar .dropdown-menu.show").forEach(function (m) {
        m.classList.remove("show");
        m.classList.remove("menubar-drop-right");
      });
    });

    var map = {
      "menu-save-r": "btn-download-script",
      "menu-open-session": "session-file-picker",
      "menu-session": "btn-save-session",
      "menu-snippets": "btn-open-snippets",
      "menu-run": "btn-run-code",
      "menu-run-all": "btn-run-all",
      "menu-clear": "btn-clear-console",
      "menu-share": "btn-share-link",
      "menu-report-pdf": "btn-export-report",
      "menu-report": "btn-export-report"
    };

    Object.keys(map).forEach(function (menuId) {
      var btn = document.getElementById(menuId);
      if (!btn) return;
      btn.addEventListener("click", function () {
        var target = map[menuId];
        if (target === "session-file-picker") {
          var input = document.getElementById("session-file-picker");
          if (input) input.click();
        } else {
          clickEl(target);
        }
      });
    });
  }

  function bindGotoTabs() {
    document.querySelectorAll("[data-goto-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tabId = btn.getAttribute("data-goto-tab");
        if (typeof window.switchTab === "function") window.switchTab(tabId);
      });
    });
  }

  window.webrHeader = {
    init: function () {
      bindMenubar();
      bindGotoTabs();
    }
  };
})();
