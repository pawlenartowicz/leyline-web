// Theme switcher: three modes (system | light | dark). Persists choice under
// "leyline-web:theme". In "system" mode, tracks prefers-color-scheme live.
// Two UIs share one state machine: cycling button (mobile) and segmented
// control (desktop). CSS picks which one is visible at the breakpoint.
(function () {
  const KEY = "leyline-web:theme";
  const MODES = ["dark", "system", "light"];
  const mql = window.matchMedia("(prefers-color-scheme: dark)");

  const resolve = (mode) => (mode === "system" ? (mql.matches ? "dark" : "light") : mode);
  const readStored = () => {
    const v = localStorage.getItem(KEY);
    return MODES.includes(v) ? v : "system";
  };

  // Pre-paint (data-theme + color-scheme) is handled by theme-init.js in
  // <head>; this script, loaded at the bottom of <body>, owns the live UI.

  const apply = (mode) => {
    if (!MODES.includes(mode)) mode = "system";
    localStorage.setItem(KEY, mode);
    const resolved = resolve(mode);
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
    // Mirrors onSystemChange — the math/mermaid loader IIFE below re-themes
    // rendered diagrams on this event.
    document.dispatchEvent(new CustomEvent("leyline:theme"));

    const root = document.getElementById("theme-control");
    if (!root) return;
    root.dataset.mode = mode;

    const cycle = document.getElementById("theme-toggle");
    if (cycle) {
      const label = `Theme: ${mode} (click to cycle)`;
      cycle.setAttribute("aria-label", label);
      cycle.setAttribute("title", `Theme: ${mode}`);
    }
    root.querySelectorAll("#theme-segment [data-theme-set]").forEach((b) => {
      b.setAttribute("aria-checked", String(b.dataset.themeSet === mode));
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    apply(readStored());

    const cycle = document.getElementById("theme-toggle");
    cycle?.addEventListener("click", () => {
      const current = readStored();
      const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
      apply(next);
    });

    document.querySelectorAll("#theme-segment [data-theme-set]").forEach((btn) => {
      btn.addEventListener("click", () => apply(btn.dataset.themeSet));
    });
  });

  // Live OS theme changes only matter while in "system" mode.
  const onSystemChange = () => {
    if (readStored() === "system") {
      const resolved = resolve("system");
      document.documentElement.setAttribute("data-theme", resolved);
      document.documentElement.style.colorScheme = resolved;
      document.dispatchEvent(new CustomEvent("leyline:theme"));
    }
  };
  if (mql.addEventListener) mql.addEventListener("change", onSystemChange);
  else if (mql.addListener) mql.addListener(onSystemChange);
})();

// Mobile sidebar drawer. CSS hides the toggle button at desktop widths.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("sidebar-toggle");
    if (!toggle) return;
    const backdrop = document.querySelector(".sidebar-backdrop");
    const sidebar = document.getElementById("sidebar");

    const setOpen = (open) => {
      document.body.dataset.sidebar = open ? "open" : "";
      toggle.setAttribute("aria-expanded", String(open));
    };

    if (sidebar) {
      const close = document.createElement("button");
      close.id = "sidebar-close";
      close.type = "button";
      close.setAttribute("aria-label", "Close navigation");
      close.textContent = "‹";
      close.addEventListener("click", () => setOpen(false));
      sidebar.prepend(close);
    }

    toggle.addEventListener("click", () => {
      setOpen(document.body.dataset.sidebar !== "open");
    });
    backdrop?.addEventListener("click", () => setOpen(false));
    sidebar?.addEventListener("click", (e) => {
      if (e.target.tagName === "A") setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.dataset.sidebar === "open") setOpen(false);
    });
  });
})();

// Sidebar nav-tree: keep <a> inside <summary> navigating without toggling
// the parent <details>. The <summary>'s default activation (toggle) fires
// when a click bubbles up to it; stopPropagation at the link stops the
// bubble while leaving the <a>'s own default action (navigate) intact.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    sidebar.querySelectorAll(".nav-summary > a").forEach((a) => {
      a.addEventListener("click", (e) => e.stopPropagation());
    });
  });
})();

// Footnote popovers: hover/tap a footnote reference to show its body inline.
//
// Built around a *separate* <div popover> element per footnote rather than
// putting `popover` on the source <li>. The two layers are then fully
// independent:
//   - sidenote IIFE owns the <li> — sidenote-rail layout, untouched here.
//   - popover IIFE owns its own cloned-content <div>s appended to <body>.
//
// Putting the popover attribute on the <li> itself broke sidenote rendering
// (UA stylesheet hides [popover]:not(:popover-open), and the cascade
// interactions with the @container sidenote rules misplaced cards).
// Cloning isolates the two systems cleanly.
//
// Popover position is computed in JS at open time from the <sup>'s
// getBoundingClientRect rather than CSS anchor positioning — works in
// every browser that supports the Popover API (Baseline 2024) regardless
// of anchor-positioning support.
//
// In sidenote mode (refs-side + wide viewport), the popover open handler
// bails when the corresponding <li> is currently rendered as a
// rail-positioned absolute card: the body is already on-screen, so the
// popover would just duplicate it. Narrow viewport (sidenote layout not
// active) keeps the popover behaviour.
//
// Interaction model:
//   - hover (or keyboard focus): transient open, auto-closes on mouseleave
//   - click: pins the popover open (stays put until clicked again, clicked
//     outside, or Escape — the latter two handled natively by popover=auto).
//     Pinned popovers get a .pinned class for a slightly bolder accent.
(function () {
  const HOVER_OPEN_DELAY = 120;
  const HOVER_CLOSE_DELAY = 200;
  const POPOVER_MARGIN = 6;

  function makePopoverFor(li) {
    const pop = document.createElement('div');
    pop.className = 'footnote-popover';
    pop.setAttribute('popover', 'auto');
    const clone = li.cloneNode(true);
    // Strip IDs from cloned descendants to avoid duplicate IDs in DOM.
    for (const el of clone.querySelectorAll('[id]')) el.removeAttribute('id');
    // Backref arrow is meaningless inside a popover (no in-flow target to
    // jump back to — the popover is anchored next to the ref already).
    for (const el of clone.querySelectorAll('.footnote-backref')) el.remove();
    while (clone.firstChild) pop.appendChild(clone.firstChild);
    return pop;
  }

  // Compute viewport-coordinate placement for the popover relative to the
  // <sup>. Prefer below + left-aligned; flip above/right if it would
  // overflow the viewport. Popover is in the top layer when open, so
  // top/left are viewport-relative.
  function placePopover(pop, sup) {
    const supRect = sup.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    let top = supRect.bottom + POPOVER_MARGIN;
    if (top + popRect.height > vh - 8 && supRect.top - popRect.height - POPOVER_MARGIN > 8) {
      top = supRect.top - popRect.height - POPOVER_MARGIN;
    }
    let left = supRect.left;
    if (left + popRect.width > vw - 8) left = Math.max(8, vw - popRect.width - 8);
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
  }

  function wireFootnotePopovers(root) {
    let wired = 0;
    for (const ref of root.querySelectorAll('article a[href^="#fn:"]')) {
      const id = ref.getAttribute('href').slice(1);
      const li = root.getElementById(id);
      if (!li) continue;
      const sup = ref.closest('sup');
      if (!sup) continue;

      const pop = makePopoverFor(li);
      document.body.appendChild(pop);
      wired++;

      let openTimer = null;
      let closeTimer = null;
      // Hover opens transiently (closes when pointer leaves); click pins
      // (popover stays open until clicked again, clicked outside, or Escape).
      // popover="auto" already gives us light-dismiss + Escape — the pinned
      // flag only gates the hover-driven auto-close.
      let pinned = false;
      const cancelOpen = () => { if (openTimer) { clearTimeout(openTimer); openTimer = null; } };
      const cancelClose = () => { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } };
      // Sidenote owns the <li>; if it's rail-positioned right now, the
      // body is already on screen and the popover would duplicate it.
      const sidenoteActive = () => getComputedStyle(li).position === 'absolute';
      const open = () => {
        if (sidenoteActive()) return;
        try {
          if (!pop.matches(':popover-open')) {
            pop.showPopover();
            placePopover(pop, sup);
          }
        } catch (_) {}
      };
      const close = () => { try { if (pop.matches(':popover-open')) pop.hidePopover(); } catch (_) {} };
      const scheduleOpen = () => { cancelClose(); cancelOpen(); openTimer = setTimeout(open, HOVER_OPEN_DELAY); };
      const scheduleClose = () => {
        cancelOpen(); cancelClose();
        if (pinned) return;
        closeTimer = setTimeout(close, HOVER_CLOSE_DELAY);
      };

      // Light-dismiss / Escape fires a `toggle` event on the popover.
      // Clear the pinned flag and visual marker when that happens so the
      // next hover behaves normally.
      pop.addEventListener('toggle', (e) => {
        if (e.newState === 'closed') {
          pinned = false;
          pop.classList.remove('pinned');
        }
      });

      ref.addEventListener('click', (e) => {
        e.preventDefault();
        cancelOpen(); cancelClose();
        if (sidenoteActive()) return;
        if (pinned) {
          pinned = false;
          pop.classList.remove('pinned');
          close();
          return;
        }
        pinned = true;
        pop.classList.add('pinned');
        try {
          pop.showPopover();
          placePopover(pop, sup);
        } catch (_) {}
      });
      ref.addEventListener('mouseenter', scheduleOpen);
      ref.addEventListener('mouseleave', scheduleClose);
      ref.addEventListener('focus', open);
      ref.addEventListener('blur', scheduleClose);
      pop.addEventListener('mouseenter', cancelClose);
      pop.addEventListener('mouseleave', scheduleClose);
      // Clicking inside the popover pins it too (same as clicking the ref),
      // so a hover-opened popover can be promoted to pinned without first
      // moving back to the ref. Real links inside the body still navigate.
      pop.addEventListener('click', (e) => {
        if (e.target.closest('a, button, [role="button"]')) return;
        if (pinned) return;
        cancelOpen(); cancelClose();
        pinned = true;
        pop.classList.add('pinned');
      });
    }
    if (wired > 0) document.body.classList.add('has-footnote-popovers');
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireFootnotePopovers(document);
  });
})();

// Footnote sidenotes: pairs each <sup> with its target <li>, sets the
// CSS anchor-name / position-anchor pair so the static layout works
// without JS, then runs a stagger pass that enforces MIN_OFFSET between
// consecutive sidenote tops so clustered references fan out as cards
// instead of piling on top of each other. Click a card to pin it on
// top; click outside or press Escape to unpin.
(function () {
  // Two body lines at 0.85em × 1.4 line-height (~19px each, ~38px
  // total) + top & bottom padding (0.2rem each, ~6.4px) + a small
  // buffer. Sized so every clipped card always shows at least two full
  // rows of body text, never a half-clipped second line.
  const MIN_OFFSET = 48;

  function collectPairs(root) {
    const pairs = [];
    for (const ref of root.querySelectorAll('article a[href^="#fn:"]')) {
      const id = ref.getAttribute('href').slice(1);     // "fn:3"
      const sup = ref.closest('sup');
      const li = root.getElementById(id);
      if (!sup || !li) continue;
      const anchor = `--${id.replace(':', '-')}`;       // "--fn-3"
      sup.style.setProperty('anchor-name', anchor);
      li.style.setProperty('position-anchor', anchor);
      pairs.push({ sup, li });
    }
    return pairs;
  }

  function inSidenoteMode(li) {
    return getComputedStyle(li).position === 'absolute';
  }

  function staggerSidenotes(article, pairs) {
    if (!pairs.length) return;
    if (!inSidenoteMode(pairs[0].li)) {
      // @container query didn't match — bottom block is in effect.
      // Clear any inline top/clip values left over from a previous
      // wider layout so the natural flow positioning takes over.
      for (const { li } of pairs) {
        li.style.removeProperty('top');
        li.style.removeProperty('--collapse-height');
      }
      return;
    }
    // The <li>'s containing block is whatever ancestor is positioned (or
    // a query container, or a top-layer). Don't assume <article> — read
    // offsetParent from the first <li> to find out. Falls back to <body>
    // if offsetParent is somehow null (display:none or detached).
    const cb = pairs[0].li.offsetParent || document.body;
    const cbTop = cb.getBoundingClientRect().top;
    // 1) Compute the desired top for every card.
    const tops = [];
    let prevTop = -Infinity;
    for (const { sup } of pairs) {
      const supTop = sup.getBoundingClientRect().top - cbTop;
      const top = Math.max(supTop, prevTop + MIN_OFFSET);
      tops.push(top);
      prevTop = top;
    }
    // 2) Drop any prior clip and apply tops, then measure each card's
    // natural height (== scrollHeight with --collapse-height unset).
    // Width is fixed by --sidenote-rail so heights are independent.
    for (let i = 0; i < pairs.length; i++) {
      const li = pairs[i].li;
      li.style.removeProperty('--collapse-height');
      li.style.setProperty('top', tops[i] + 'px');
    }
    const natural = pairs.map(p => p.li.scrollHeight);
    // 3) Clip only when natural height exceeds the slot before the next
    // card. Solo / wide-gap cards render fully; only true overflow gets
    // clipped. The last card has no successor and is left unclipped.
    for (let i = 0; i < pairs.length - 1; i++) {
      const slot = tops[i + 1] - tops[i];
      if (natural[i] > slot) {
        pairs[i].li.style.setProperty('--collapse-height', slot + 'px');
      }
    }
  }

  function wirePinning(pairs) {
    const sidenotes = pairs.map(p => p.li);
    for (const li of sidenotes) {
      li.setAttribute('tabindex', '0');
      li.addEventListener('click', (e) => {
        // Don't pin when the user is clicking a link inside the note.
        if (e.target.closest('a')) return;
        const wasPinned = li.classList.contains('pinned');
        for (const other of sidenotes) other.classList.remove('pinned');
        if (!wasPinned) li.classList.add('pinned');
      });
    }
    document.addEventListener('click', (e) => {
      if (e.target.closest('article .footnotes li[id^="fn:"]')) return;
      for (const li of sidenotes) li.classList.remove('pinned');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      for (const li of sidenotes) li.classList.remove('pinned');
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const article = document.querySelector('article');
    if (!article) return;
    const pairs = collectPairs(document);
    if (!pairs.length) return;
    staggerSidenotes(article, pairs);
    if (document.body.classList.contains('refs-side')) {
      wirePinning(pairs);
    }
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => staggerSidenotes(article, pairs), 100);
    });
    // Font load shifts line metrics — re-stagger once Web fonts arrive.
    document.fonts?.ready?.then(() => staggerSidenotes(article, pairs));
  });
})();

// TOC scroll-spy: lights the entry for the section currently being read.
// Each TOC link points at an in-article heading (#id); the current section
// is the last heading whose top has crossed a "read line" a little below the
// viewport top. A rAF-throttled scroll/resize pass keeps it cheap, and the
// whole thing is progressive — with JS off the list is just muted links.
(function () {
  // Distance from the viewport top at which a heading counts as "reached".
  // Keep in rough sympathy with scroll-margin-top so a clicked entry lights
  // up the moment its heading settles into place.
  const READ_LINE = 96;

  document.addEventListener("DOMContentLoaded", () => {
    const list = document.querySelector(".widget-toc .toc-list");
    if (!list) return;

    const entries = [];
    for (const a of list.querySelectorAll(".toc-item > a")) {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) continue;
      const heading = document.getElementById(decodeURIComponent(href.slice(1)));
      const li = a.closest(".toc-item");
      if (heading && li) entries.push({ heading, li });
    }
    if (!entries.length) return;

    let activeLi = null;
    const update = () => {
      // Entries are in document order; walk down while headings sit above
      // the read line, so the deepest one we've scrolled past wins. Before
      // the first heading is reached, the first entry stays lit.
      let current = entries[0].li;
      for (const { heading, li } of entries) {
        if (heading.getBoundingClientRect().top <= READ_LINE) current = li;
        else break;
      }
      if (current === activeLi) return;
      activeLi?.classList.remove("is-current");
      current.classList.add("is-current");
      activeLi = current;
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  });
})();

// Right-rail drift: the table of contents rests level with the article top,
// then eases down to a comfortable reading height (~30vh of the viewport) once
// you scroll into the body, and holds there. Sticky positioning (CSS) does the
// pinning; this only nudges how far down the rail sits via translateY. It's
// desktop-only — on narrow viewports the rail sits in flow below the article —
// and a no-op under reduced-motion, where the CSS leaves it top-aligned.
//
// Gated by the toc_follow knob (body[data-toc-follow]): only "drift" drifts.
// "pin" (or any other value) leaves the rail at its CSS resting position —
// plain sticky near the top. The `references` right-rail mode renders no ToC
// rail, so the widget-toc guard below already makes this a no-op there.
(function () {
  const desktop = window.matchMedia("(min-width: 64rem)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const REST_FRACTION = 0.3; // settled distance from the top, as a share of viewport height
  const RAMP_FRACTION = 0.55; // scroll distance (in viewports) over which it settles

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.tocFollow !== "drift") return;
    const rail = document.getElementById("sidebar-right");
    if (!rail || !rail.querySelector(".widget-toc")) return;

    // The CSS resting offset (top: var(--space-3)); read it so drift is
    // measured from wherever the rail actually starts, font-size and all.
    const startPx = () => Number.parseFloat(getComputedStyle(rail).top) || 16;

    let raf = 0;
    const apply = () => {
      raf = 0;
      if (!desktop.matches || reduced.matches) {
        rail.style.transform = "";
        return;
      }
      const vh = window.innerHeight;
      const rest = REST_FRACTION * vh;
      const start = startPx();
      const ramp = RAMP_FRACTION * vh;
      const t = ramp > 0 ? Math.min(1, Math.max(0, window.scrollY / ramp)) : 1;
      const eased = 1 - (1 - t) ** 3; // easeOutCubic: lifts off quickly, settles softly
      const drift = Math.max(0, (rest - start) * eased);
      rail.style.transform = `translateY(${drift}px)`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    desktop.addEventListener("change", apply);
    reduced.addEventListener("change", apply);
    apply();
  });
})();

/* ----- Vault search (command-palette modal) ----------------------------
   A trigger button (field-styled, placed in any rail) opens ONE centered
   modal <dialog> over a dimmed backdrop. The modal owns the input and the
   results — the narrow rail no longer renders a result column. Debounced
   fetch of the per-vault trigram index (GET <prefix>_search?q=); highlight
   offsets in the JSON are code-point (rune) offsets, sliced with Array.from
   so Polish diacritics line up. Keyboard: up/down move, enter opens, esc
   closes (native to <dialog>). With JS off the trigger is inert. */
(function () {
  const DEBOUNCE_MS = 120;
  const DEFAULT_MIN = 2;

  const escapeHtml = (s) =>
    s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

  const highlight = (text, ranges) => {
    if (!ranges || !ranges.length) return escapeHtml(text);
    const chars = Array.from(text);
    const sorted = ranges
      .filter((r) => Array.isArray(r) && r.length === 2 && r[1] > r[0])
      .sort((a, b) => a[0] - b[0]);
    let out = "";
    let cur = 0;
    for (const [start, end] of sorted) {
      const s = Math.max(cur, Math.min(start, chars.length));
      const e = Math.max(s, Math.min(end, chars.length));
      if (s > cur) out += escapeHtml(chars.slice(cur, s).join(""));
      out += `<mark>${escapeHtml(chars.slice(s, e).join(""))}</mark>`;
      cur = e;
    }
    if (cur < chars.length) out += escapeHtml(chars.slice(cur).join(""));
    return out;
  };

  const crumb = (path) =>
    path.split("/").map(escapeHtml).join('<span class="sep">›</span>');

  const stateHtml = (msg) => `<div class="search-state">${msg}</div>`;

  const render = (data) => {
    const results = data.results || [];
    if (!results.length) {
      return stateHtml(`No matches for &ldquo;${escapeHtml(data.q)}&rdquo;.`);
    }
    const meta = `<div class="search-meta">${results.length} ${
      results.length === 1 ? "result" : "results"
    }</div>`;
    const items = results
      .map(
        (r, i) =>
          `<li class="search-item${i === 0 ? " is-current" : ""}" role="option">` +
          `<a href="${escapeHtml(r.url)}">` +
          `<span class="search-title">${escapeHtml(r.title || r.path)}</span>` +
          `<span class="search-path">${crumb(r.path)}</span>` +
          (r.snippet
            ? `<p class="search-snippet">${highlight(r.snippet, r.highlights)}</p>`
            : "") +
          `</a></li>`,
      )
      .join("");
    return meta + `<ul class="search-list">${items}</ul>`;
  };

  // One modal, built lazily on first open and shared by every trigger on the
  // page (there is exactly one vault per page, so all triggers query the same
  // endpoint). searchUrl / minLen are bound from the activating trigger.
  let dialog, input, box, opener;
  let searchUrl = "";
  let minLen = DEFAULT_MIN;
  let timer = null;
  let seq = 0;
  let idx = 0;

  const items = () => Array.from(box.querySelectorAll(".search-item"));
  const select = (n) => {
    const list = items();
    if (!list.length) return;
    idx = (n + list.length) % list.length;
    list.forEach((el, k) => el.classList.toggle("is-current", k === idx));
    list[idx].scrollIntoView({ block: "nearest" });
  };
  const show = (html) => {
    box.innerHTML = html;
    box.scrollTop = 0;
    idx = 0;
  };

  const run = async () => {
    const q = input.value.trim();
    if (q.length < minLen) {
      show(q.length === 0 ? "" : stateHtml(`Type at least ${minLen} characters.`));
      return;
    }
    const mine = ++seq;
    try {
      const res = await fetch(`${searchUrl}?q=${encodeURIComponent(q)}`, {
        headers: { Accept: "application/json" },
      });
      if (mine !== seq) return; // a newer keystroke superseded this fetch
      if (!res.ok) {
        show(stateHtml("Search is unavailable."));
        return;
      }
      const data = await res.json();
      if (mine !== seq) return;
      show(render(data));
    } catch {
      if (mine === seq) show(stateHtml("Search is unavailable."));
    }
  };

  function build() {
    dialog = document.createElement("dialog");
    dialog.className = "search-modal";
    dialog.setAttribute("aria-label", "Search");
    dialog.innerHTML =
      '<div class="search-modal__panel">' +
      '<div class="search-modal__head">' +
      '<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
      '<input class="search-input" type="search" placeholder="Search the vault" aria-label="Search the vault" autocomplete="off" spellcheck="false">' +
      '<button class="search-modal__close" type="button" aria-label="Close search">esc</button>' +
      "</div>" +
      '<div class="search-results" role="listbox" aria-label="Search results"></div>' +
      "</div>";
    document.body.appendChild(dialog);
    input = dialog.querySelector(".search-input");
    box = dialog.querySelector(".search-results");

    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(run, DEBOUNCE_MS);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        select(idx + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        select(idx - 1);
      } else if (e.key === "Enter") {
        const a = items()[idx]?.querySelector("a");
        if (a) {
          e.preventDefault();
          window.location.href = a.href;
        }
      }
      // Escape is handled natively by <dialog> — it closes the modal.
    });
    // A click on the dialog element itself (the backdrop area outside the
    // floated panel) dismisses; clicks inside the panel target its children.
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog
      .querySelector(".search-modal__close")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => opener?.focus());
  }

  function openFrom(trigger) {
    if (!dialog) build();
    searchUrl = trigger.dataset.searchUrl || "";
    minLen = parseInt(trigger.dataset.minQueryLen || "", 10) || DEFAULT_MIN;
    opener = trigger;
    input.value = "";
    show("");
    dialog.showModal();
    input.focus();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".search-trigger").forEach((t) => {
      t.addEventListener("click", () => openFrom(t));
    });
  });
})();

// Client-side math + diagram rendering. The server emits only hooks:
// goldmark-mathjax wraps TeX in <span class="math inline">\(…\)</span> /
// <span class="math display">\[…\]</span>, and the goldmark mermaid
// extension (client mode, NoScript) emits bare <pre class="mermaid">.
// Everything loads lazily from this theme's vendored static assets
// (same-origin, so the strict CSP passes); pages without math or diagrams
// fetch nothing. Math strategy: KaTeX first (fast, ~300 KB), and only the
// spans KaTeX throws on go to MathJax (heavier, but it's what Obsidian
// itself uses — the parity net). Any layer failing leaves the raw TeX /
// diagram source visible, same as a no-JS reader sees.
(function () {
  // Captured at execute time (currentScript is null later, in callbacks).
  // src is …/_theme/leyline_base/theme.js — child themes load this file as
  // a layer under the same URL shape — so the replace works at any vault
  // mount depth.
  const script = document.currentScript;
  if (!script || !script.src) return;
  const VENDOR = script.src.replace(/theme\.js(\?.*)?$/, "vendor/");

  const loadScript = (url) =>
    new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error("failed to load " + url));
      document.head.appendChild(s);
    });
  const loadCSS = (url) => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = url;
    document.head.appendChild(l);
  };

  async function renderMath(spans) {
    loadCSS(VENDOR + "katex/katex.min.css");
    await loadScript(VENDOR + "katex/katex.min.js");
    const failed = [];
    for (const el of spans) {
      const raw = el.textContent;
      // Strip goldmark-mathjax's \(…\) / \[…\] wrappers — KaTeX wants bare TeX.
      const tex = raw.slice(2, -2);
      try {
        window.katex.render(tex, el, {
          displayMode: el.classList.contains("display"),
          throwOnError: true,
        });
      } catch (_) {
        el.textContent = raw; // undo any partial mutation
        failed.push(el);
      }
    }
    if (!failed.length) return;
    // MathJax reads window.MathJax as config iff set before its script runs.
    // typeset:false stops it scanning the whole page — KaTeX-rendered spans
    // no longer contain TeX delimiters, but there's no reason to walk them.
    // Its default delimiters match the \(…\)/\[…\] text restored above.
    window.MathJax = {
      startup: { typeset: false },
      chtml: { fontURL: VENDOR + "mathjax/output/chtml/fonts/woff-v2" },
    };
    await loadScript(VENDOR + "mathjax/tex-chtml.js");
    await window.MathJax.startup.promise;
    await window.MathJax.typesetPromise(failed);
  }

  async function renderMermaid(blocks) {
    await loadScript(VENDOR + "mermaid/mermaid.min.js");
    // Stash sources: mermaid.run replaces element content with SVG, and
    // re-theming needs the original text back.
    for (const el of blocks) el.dataset.mermaidSrc = el.textContent;
    const isDark = () =>
      document.documentElement.getAttribute("data-theme") === "dark";
    let renderedDark = null;
    const run = () => {
      renderedDark = isDark();
      window.mermaid.initialize({
        startOnLoad: false,
        theme: renderedDark ? "dark" : "neutral",
      });
      return window.mermaid.run({ nodes: blocks });
    };
    document.addEventListener("leyline:theme", () => {
      if (isDark() === renderedDark) return; // mode changed, palette didn't
      for (const el of blocks) {
        el.removeAttribute("data-processed"); // mermaid's "done" marker
        el.textContent = el.dataset.mermaidSrc;
      }
      run().catch((e) => console.warn("mermaid re-render:", e));
    });
    await run();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const math = document.querySelectorAll(".page-body .math");
    if (math.length) {
      renderMath(Array.from(math)).catch((e) => console.warn("math render:", e));
    }
    const diagrams = document.querySelectorAll(".page-body pre.mermaid");
    if (diagrams.length) {
      renderMermaid(Array.from(diagrams)).catch((e) =>
        console.warn("mermaid render:", e),
      );
    }
  });
})();
