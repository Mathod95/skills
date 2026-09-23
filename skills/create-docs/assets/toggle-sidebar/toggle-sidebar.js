(function () {
  "use strict";

  const CONFIG = {
    showNavigationByDefault: true,
    showTocByDefault: true,
    toggleButton: "all", // "all" | "nav" | "toc" | "none"
    enableKeyBindings: true,
    tooltips: {
      both: "Toggle navigation and table of contents",
      nav: "Toggle navigation",
      toc: "Toggle table of contents",
    },
  };

  const STORAGE_KEY = "zts-sidebar-state";
  const root = document.documentElement;

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return (
        stored || {
          nav: CONFIG.showNavigationByDefault,
          toc: CONFIG.showTocByDefault,
        }
      );
    } catch {
      return { nav: CONFIG.showNavigationByDefault, toc: CONFIG.showTocByDefault };
    }
  }

  function iconSvg(state) {
    const rect = '<rect width="18" height="18" x="3" y="3" rx="2"></rect>';
    let inner;
    if (state.nav && state.toc) {
      inner = '<path d="M9 3v18"></path><path d="M15 3v18"></path>'; // columns-3
    } else if (state.nav && !state.toc) {
      inner = '<path d="M9 3v18"></path>'; // panel-left
    } else if (!state.nav && state.toc) {
      inner = '<path d="M15 3v18"></path>'; // panel-right
    } else {
      inner =
        '<path d="M7 8h8"></path><path d="M7 12h10"></path><path d="M7 16h6"></path>'; // square-text
    }
    return (
      '<svg class="lucide" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      rect +
      inner +
      "</svg>"
    );
  }

  function updateButtonIcon(state) {
    const btn = document.querySelector(".zts-toggle-btn");
    if (btn) btn.innerHTML = iconSvg(state);
  }

  function apply(state) {
    root.classList.toggle("zts-hide-nav", !state.nav);
    root.classList.toggle("zts-hide-toc", !state.toc);
    updateButtonIcon(state);
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();

  // Appliqué immédiatement, avant d'attendre DOMContentLoaded, pour éviter
  // un flash de la sidebar visible puis masquée au premier chargement.
  apply(state);

  window.ZensicalToggleSidebar = {
    setNav: (show) => {
      state.nav = show;
      apply(state);
      save(state);
    },
    setToc: (show) => {
      state.toc = show;
      apply(state);
      save(state);
    },
    toggleNav: () => window.ZensicalToggleSidebar.setNav(!state.nav),
    toggleToc: () => window.ZensicalToggleSidebar.setToc(!state.toc),
    toggleBoth: () => {
      const show = !(state.nav && state.toc);
      state.nav = show;
      state.toc = show;
      apply(state);
      save(state);
    },
  };

  function createButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "md-header__button md-icon zts-toggle-btn";
    btn.innerHTML = iconSvg(state);

    if (CONFIG.toggleButton === "nav") {
      btn.setAttribute("aria-label", CONFIG.tooltips.nav);
      btn.title = CONFIG.tooltips.nav;
      btn.addEventListener("click", () => window.ZensicalToggleSidebar.toggleNav());
    } else if (CONFIG.toggleButton === "toc") {
      btn.setAttribute("aria-label", CONFIG.tooltips.toc);
      btn.title = CONFIG.tooltips.toc;
      btn.addEventListener("click", () => window.ZensicalToggleSidebar.toggleToc());
    } else {
      btn.setAttribute("aria-label", CONFIG.tooltips.both);
      btn.title = CONFIG.tooltips.both;
      btn.addEventListener("click", () => window.ZensicalToggleSidebar.toggleBoth());
    }

    return btn;
  }

  function insertButton() {
    if (CONFIG.toggleButton === "none") return;

    const header = document.querySelector(".md-header__inner");
    if (!header || header.querySelector(".zts-toggle-btn")) return;

    header.appendChild(createButton());
  }

  function init() {
    apply(state);
    insertButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Se relance à chaque navigation "instantanée" (SPA-like) du thème.
  if (typeof document$ !== "undefined" && document$?.subscribe) {
    document$.subscribe(init);
  }

  if (CONFIG.enableKeyBindings) {
    document.addEventListener("keydown", (event) => {
      if (event.defaultPrevented) return;

      const target = event.target;
      if (target instanceof Element) {
        if (target.matches("input, textarea, select") || target.isContentEditable) {
          return;
        }
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      let handled = true;
      if (event.key === "b") window.ZensicalToggleSidebar.toggleBoth();
      else if (event.key === "m") window.ZensicalToggleSidebar.toggleNav();
      else if (event.key === "t") window.ZensicalToggleSidebar.toggleToc();
      else handled = false;

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }
})();
