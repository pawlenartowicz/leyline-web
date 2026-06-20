// leyline-web inline PDF viewer (server-rasterized).
//
// The server pre-renders every page to a PNG via poppler (pdftocairo) and
// extracts per-word bounding boxes via pdftotext. The browser side fetches
// a single meta.json (page dims + text layer) and drops one <img> per page
// into the host. IntersectionObserver triggers lazy loading so 50-page
// papers don't fetch every image upfront, and a transparent text-layer
// overlay reproduces Mozilla's PDF.js feel for selection + Ctrl-F search.
//
// The script auto-discovers every .leyline-pdf-host on the page and binds
// independent state per host, so both the dedicated PDF page (one host)
// and markdown notes that embed `![[paper.pdf]]` (potentially several
// hosts) work with the same viewer.
//
// Compared to the previous PDF.js-based viewer the rendering quality is
// strictly better for LaTeX / academic PDFs (Computer Modern Type 1 and
// embedded Type 3 fonts handled correctly by Cairo's glyph rasterizer),
// the on-the-wire payload is smaller, and the CSP no longer needs to
// allow WASM or blob: workers.

for (const host of document.querySelectorAll(".leyline-pdf-host")) {
  if (host.dataset.leylinePdfBound === "1") continue;
  host.dataset.leylinePdfBound = "1";
  initViewer(host).catch((err) => {
    console.error("leyline-pdf: viewer failed", err);
    host.innerHTML = '<p class="pdf-error">PDF could not be loaded.</p>';
  });
}

async function initViewer(host) {
  const metaURL = host.dataset.pdfMeta;
  const rawURL = host.dataset.pdfRaw;
  if (!metaURL) {
    throw new Error("missing data-pdf-meta");
  }

  const resp = await fetch(metaURL, { credentials: "same-origin" });
  if (resp.status === 501) {
    // Server can't rasterize (poppler missing). Fall back to the
    // browser-native PDF viewer in an iframe so the user still has a
    // working preview without operator intervention.
    fallbackToNative(host, rawURL);
    return;
  }
  if (!resp.ok) {
    throw new Error(`meta.json: HTTP ${resp.status}`);
  }
  const meta = await resp.json();
  if (!meta.pages || meta.pages.length === 0) {
    throw new Error("meta.json: empty page list");
  }

  const state = {
    host,
    meta,
    rawURL,
    // PDF user-space coordinates are in points (1pt = 1/72in). The
    // rasterized image's pixel dimensions are width*dpi/72 × height*dpi/72,
    // and the text layer's percentage-based positioning is invariant to
    // both — we only need this to size the image's intrinsic dimensions
    // for the layout pass.
    imageScale: meta.dpi / 72,
    zoom: readZoom(metaURL),
    pages: [],
    // 1 = fit-to-host width at zoom 1. Recomputed on resize.
    baseFit: 1,
  };

  host.innerHTML = "";
  for (const p of meta.pages) {
    state.pages.push(createPageEntry(p, host, metaURL, meta.version));
  }
  recomputeLayout(state);
  attachIntersectionObserver(state);
  attachResizeObserver(state);
  wireToolbar(state, metaURL);
}

// fallbackToNative replaces the page-image host with a same-origin iframe
// pointing at the raw PDF. Triggered when the server cannot rasterize
// (HTTP 501 → poppler not installed).
function fallbackToNative(host, rawURL) {
  host.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.className = "leyline-pdf-fallback";
  iframe.src = rawURL;
  iframe.loading = "lazy";
  host.appendChild(iframe);
}

// createPageEntry builds the placeholder DOM for one page (a sized
// container holding a deferred <img> and a transparent text-layer with
// per-word positioned spans). The image src is left blank until the
// page nears the viewport — see attachIntersectionObserver below.
function createPageEntry(page, host, metaURL, version) {
  const container = document.createElement("div");
  container.className = "leyline-pdf-page";
  container.dataset.pageNum = String(page.index);
  // Pages declare their intrinsic aspect ratio via CSS variables so the
  // layout pass can compute pixel sizes without re-asking for each
  // image's natural dimensions (those don't arrive until the image
  // loads, and we want the scrollbar height correct upfront).
  container.style.setProperty("--page-width-pt", String(page.width));
  container.style.setProperty("--page-height-pt", String(page.height));

  const img = document.createElement("img");
  img.className = "leyline-pdf-image";
  img.alt = `page ${page.index}`;
  img.decoding = "async";
  // Deferred src — set when IntersectionObserver fires. The data-* attr
  // holds the eventual URL so we don't have to thread metaURL into the
  // observer callback.
  img.dataset.pageSrc = pageImageURL(metaURL, page.index, version);
  container.appendChild(img);

  const textLayer = document.createElement("div");
  textLayer.className = "leyline-pdf-text-layer";
  populateTextLayer(textLayer, page);
  container.appendChild(textLayer);

  host.appendChild(container);

  return {
    page,
    container,
    img,
    textLayer,
    loaded: false,
  };
}

// populateTextLayer fills the transparent overlay with one absolutely-
// positioned <span> per word from pdftotext. Coordinates and font-size
// use percentage / container-query-height units so the layer scales with
// CSS zoom of the parent container — no JS recompute on zoom needed.
function populateTextLayer(layer, page) {
  if (!page.words || page.words.length === 0) return;
  const W = page.width, H = page.height;
  const frag = document.createDocumentFragment();
  for (const w of page.words) {
    if (!w.t) continue;
    const span = document.createElement("span");
    span.textContent = w.t;
    const wPct = ((w.x1 - w.x0) / W) * 100;
    const hPct = ((w.y1 - w.y0) / H) * 100;
    span.style.left = ((w.x0 / W) * 100).toFixed(3) + "%";
    span.style.top = ((w.y0 / H) * 100).toFixed(3) + "%";
    span.style.width = wPct.toFixed(3) + "%";
    // Container-query height (`cqh`) = 1% of the container's height. The
    // word's bbox height in points / page height in points × 100 = same
    // value as hPct, so font-size scales perfectly with whatever CSS
    // height the parent ends up with. No JS reflow needed on zoom.
    span.style.fontSize = hPct.toFixed(3) + "cqh";
    frag.appendChild(span);
  }
  layer.appendChild(frag);
}

// pageImageURL composes the /_pdf/.../page-NNN.png URL from the meta.json
// URL — the two share a directory in the URL space, so we just rebase
// the last segment. When meta.version is present, it's appended as a
// query string so a content swap at the same source path produces a new
// URL — browsers fetch it fresh instead of reusing an old (immutable)
// cached entry that no longer matches the rendered bytes.
function pageImageURL(metaURL, pageNum, version) {
  const i = metaURL.lastIndexOf("/");
  const base = i >= 0 ? metaURL.slice(0, i) : metaURL;
  const path = base + "/page-" + String(pageNum).padStart(3, "0") + ".png";
  return version ? path + "?v=" + encodeURIComponent(version) : path;
}

// recomputeLayout sets each page's CSS pixel dimensions from current host
// width and zoom factor. Pages preserve aspect ratio and fit to the host
// width at zoom 1; higher zoom values scale the entire strip uniformly.
function recomputeLayout(state) {
  const hostW = hostContentWidth(state.host);
  // Use the widest page as the fit reference so pages of different
  // intrinsic widths (mixed-orientation docs) stay proportional.
  let maxPt = 0;
  for (const entry of state.pages) {
    if (entry.page.width > maxPt) maxPt = entry.page.width;
  }
  if (maxPt <= 0) maxPt = 612; // fallback letter
  state.baseFit = hostW / maxPt;
  for (const entry of state.pages) {
    // Math.floor on width prevents subpixel rounding from pushing the
    // page past hostW, which would trigger a stubborn 1-pixel horizontal
    // scrollbar even though there's nothing to actually scroll. Height
    // tracks proportionally — a fractional CSS pixel taller is invisible.
    const cssW = Math.floor(entry.page.width * state.baseFit * state.zoom);
    const cssH = cssW * (entry.page.height / entry.page.width);
    entry.container.style.width = cssW + "px";
    entry.container.style.height = cssH + "px";
  }
}

function hostContentWidth(host) {
  const cs = getComputedStyle(host);
  const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  // 1px safety margin defeats subpixel rounding — page.width * baseFit can
  // round up to clientWidth + 1 on some DPIs, triggering a horizontal
  // scrollbar at default zoom even though the math nominally fits.
  const w = host.clientWidth - padX - 1;
  return w > 0 ? w : (host.getBoundingClientRect().width - padX - 1 || 612);
}

// attachIntersectionObserver wires lazy image loading: each page entry's
// <img> src is set the first time the page nears the host's visible
// region. Once loaded the image stays in the DOM.
function attachIntersectionObserver(state) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const num = Number(e.target.dataset.pageNum);
        const entry = state.pages[num - 1];
        if (entry && !entry.loaded) {
          entry.img.src = entry.img.dataset.pageSrc;
          entry.loaded = true;
        }
      }
    },
    { root: state.host, rootMargin: "100% 0% 100% 0%", threshold: 0.01 }
  );
  for (const entry of state.pages) io.observe(entry.container);
}

// attachResizeObserver recomputes page CSS dimensions when the host's
// content width changes (window resize, sidebar toggle, font scaling).
function attachResizeObserver(state) {
  let last = hostContentWidth(state.host);
  const ro = new ResizeObserver(() => {
    const next = hostContentWidth(state.host);
    if (Math.abs(next - last) < 0.5) return;
    last = next;
    recomputeLayout(state);
  });
  ro.observe(state.host);
}

// wireToolbar injects the zoom/download overlay into the host's wrapping
// frame (the .leyline-pdf-frame above the host) and wires up events. The
// toolbar lives in the DOM as a sibling of the host so it can be absolute-
// positioned over the page strip without scrolling with it. If no frame
// is present the toolbar attaches to the host itself — still works, just
// scrolls with content; templates ship the frame for proper overlay.
function wireToolbar(state, metaURL) {
  const root = ensureToolbar(state.host, state.rawURL);
  if (!root) return;
  const setZoom = (next) => {
    next = Math.max(0.25, Math.min(5, next));
    if (Math.abs(next - state.zoom) < 1e-6) return;
    state.zoom = next;
    writeZoom(metaURL, next);
    updateZoomLabel(root, next);
    recomputeLayout(state);
  };
  root.querySelector(".pdf-zoom-in")?.addEventListener("click", () => setZoom(state.zoom * 1.2));
  root.querySelector(".pdf-zoom-out")?.addEventListener("click", () => setZoom(state.zoom / 1.2));
  root.querySelector(".pdf-zoom-reset")?.addEventListener("click", () => setZoom(1));
  updateZoomLabel(root, state.zoom);
}

// ensureToolbar builds (or returns the existing) .pdf-toolbar overlay
// element belonging to a given host. Idempotent so re-init paths can't
// accumulate stacked toolbars.
function ensureToolbar(host, rawURL) {
  const parent = host.closest(".leyline-pdf-frame") || host.parentElement || host;
  let toolbar = parent.querySelector(":scope > .pdf-toolbar");
  if (toolbar) return toolbar;
  toolbar = document.createElement("div");
  toolbar.className = "pdf-toolbar";
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "PDF viewer controls");
  toolbar.innerHTML = `
    <button type="button" class="pdf-zoom-out" aria-label="Zoom out">−</button>
    <button type="button" class="pdf-zoom-reset" aria-label="Reset zoom">100%</button>
    <button type="button" class="pdf-zoom-in" aria-label="Zoom in">+</button>
  `;
  if (rawURL) {
    const dl = document.createElement("a");
    dl.className = "pdf-download";
    dl.href = rawURL;
    dl.setAttribute("download", "");
    dl.setAttribute("aria-label", "Download original PDF");
    dl.textContent = "⤓";
    toolbar.appendChild(dl);
  }
  // Insert as the frame's first child so it paints above the host's
  // initial paint region without depending on z-index source order.
  parent.insertBefore(toolbar, parent.firstChild);
  return toolbar;
}

function updateZoomLabel(root, zoom) {
  const reset = root.querySelector(".pdf-zoom-reset");
  if (reset) reset.textContent = Math.round(zoom * 100) + "%";
}

// readZoom / writeZoom persist the toolbar's zoom factor per-document so
// reopening a PDF lands the reader back at their last setting. Keyed by
// metaURL (which is unique per source PDF).
function readZoom(metaURL) {
  try {
    const v = sessionStorage.getItem("leyline-pdf-zoom:" + metaURL);
    const n = v ? parseFloat(v) : 1;
    return Number.isFinite(n) && n > 0 ? n : 1;
  } catch {
    return 1;
  }
}
function writeZoom(metaURL, zoom) {
  try {
    sessionStorage.setItem("leyline-pdf-zoom:" + metaURL, String(zoom));
  } catch { /* private mode, no-op */ }
}
