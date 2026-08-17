// Sumário sempre visível: sem toggle, seções sempre abertas (desktop fixo)
(function () {
  var DESKTOP = "(min-width: 992px)";

  function isDesktop() {
    return window.matchMedia && window.matchMedia(DESKTOP).matches;
  }

  function sitePrefix() {
    var el = document.querySelector('link[href*="site_libs"], script[src*="site_libs"]');
    if (!el) return "";
    var href = el.getAttribute("href") || el.getAttribute("src") || "";
    var i = href.indexOf("site_libs");
    return i >= 0 ? href.slice(0, i) : "";
  }

  function ensureDesktopSidebar() {
    var sb = document.getElementById("quarto-sidebar");
    if (!sb) return;
    if (isDesktop()) {
      sb.classList.add("show");
      sb.classList.remove("collapsing", "eco-toc-open");
      sb.style.transform = "none";
      sb.style.display = "flex";
      sb.style.visibility = "visible";
      sb.style.position = "fixed";
      sb.style.left = "0";
      sb.style.top = "0";
      sb.style.bottom = "0";
      sb.setAttribute("aria-expanded", "true");
    }
  }

  function disableSidebarToggles() {
    var sb = document.getElementById("quarto-sidebar");
    if (!sb) return;

    // Abre todas as seções
    sb.querySelectorAll(".sidebar-item-section ul.collapse, .sidebar-menu-container ul.collapse").forEach(function (ul) {
      ul.classList.add("show");
      ul.classList.remove("collapsing");
    });

    // Remove comportamento de collapse dos cabeçalhos
    sb.querySelectorAll("[data-bs-toggle='collapse'], .quarto-btn-toggle, a.quarto-toggle").forEach(function (el) {
      el.removeAttribute("data-bs-toggle");
      el.removeAttribute("data-bs-target");
      el.removeAttribute("href");
      el.classList.remove("collapsed", "quarto-btn-toggle", "quarto-toggle");
      el.setAttribute("aria-expanded", "true");
      el.style.pointerEvents = "none";
    });

    sb.querySelectorAll(".quarto-sidebar-toggle-icon").forEach(function (icon) {
      icon.remove();
    });
  }

  function setTocOpen(open) {
    var sb = document.getElementById("quarto-sidebar");
    var btn = document.getElementById("eco-toc-toggle");
    if (!sb) return;
    if (open) {
      sb.classList.add("show", "eco-toc-open");
      if (btn) {
        btn.setAttribute("aria-expanded", "true");
        btn.textContent = "Ocultar sumário";
      }
    } else {
      sb.classList.remove("eco-toc-open");
      if (btn) {
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "Mostrar sumário";
      }
    }
  }

  function setupMobileTocBar() {
    if (document.getElementById("eco-toc-bar")) return;

    var bar = document.createElement("div");
    bar.id = "eco-toc-bar";

    var brand = document.createElement("a");
    brand.className = "eco-toc-brand";
    brand.href = sitePrefix() || "/";

    var mark = document.createElement("img");
    mark.src = sitePrefix() + "brand/mark.svg";
    mark.alt = "";
    mark.width = 28;
    mark.height = 28;
    brand.appendChild(mark);
    brand.appendChild(document.createTextNode("Área Basal"));

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "eco-toc-toggle";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "quarto-sidebar");
    btn.textContent = "Mostrar sumário";
    btn.addEventListener("click", function () {
      var sb = document.getElementById("quarto-sidebar");
      var open = !(sb && sb.classList.contains("eco-toc-open"));
      setTocOpen(open);
      if (open && sb) sb.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    bar.appendChild(brand);
    bar.appendChild(btn);
    document.body.insertBefore(bar, document.body.firstChild);

    document.addEventListener("click", function (e) {
      if (isDesktop()) return;
      var link = e.target.closest("#quarto-sidebar a[href]");
      if (link) setTocOpen(false);
    });
  }

  function fixNavbarHomeLinks() {
    // Prefer / over /index.html so crawlers see the same URL as the canonical.
    var home = sitePrefix() || "/";
    document.querySelectorAll("a.navbar-brand").forEach(function (a) {
      a.setAttribute("href", home);
    });
  }

  function setupBackToTop() {
    if (document.getElementById("eco-back-top")) return;
    var a = document.createElement("a");
    a.href = "#";
    a.id = "eco-back-top";
    a.title = "Voltar ao topo";
    a.setAttribute("aria-label", "Voltar ao topo");
    a.textContent = "↑";
    a.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.body.appendChild(a);
    function onScroll() {
      if (window.scrollY > 400) a.classList.add("eco-visible");
      else a.classList.remove("eco-visible");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function syncMode() {
    ensureDesktopSidebar();
    disableSidebarToggles();
    if (isDesktop()) {
      var sb = document.getElementById("quarto-sidebar");
      if (sb) sb.classList.remove("eco-toc-open");
    }
  }

  function init() {
    fixNavbarHomeLinks();
    setupMobileTocBar();
    setupBackToTop();
    ensureDesktopSidebar();
    disableSidebarToggles();
    syncMode();
  }

  document.addEventListener("DOMContentLoaded", init);
  // Também cobre injeção tardia do script (loader em _quarto.yml).
  if (document.readyState !== "loading") {
    init();
  }
  window.addEventListener("load", function () {
    ensureDesktopSidebar();
    disableSidebarToggles();
  });
  window.addEventListener("resize", syncMode);
  window.addEventListener(
    "scroll",
    function () {
      if (!isDesktop()) return;
      ensureDesktopSidebar();
    },
    { passive: true }
  );

  // Bloqueia qualquer clique residual em toggles do sumário
  document.addEventListener(
    "click",
    function (e) {
      var t = e.target.closest(
        "#quarto-sidebar .quarto-btn-toggle, #quarto-sidebar a.quarto-toggle, #quarto-sidebar .quarto-sidebar-toggle-icon"
      );
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      disableSidebarToggles();
    },
    true
  );
})();
