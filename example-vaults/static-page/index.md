---
title: "Self-hosted, real-time sync for Obsidian"
description: "Self-hosted, real-time Obsidian sync — plain Markdown on disk, line-level merge, git-backed history, light enough for a $5 VPS."
---

<!-- Landing hero. Authored as raw HTML on purpose: the markdown pipeline
     strips a leading `# H1` (titleExtractTransformer), so the headline must
     not be a markdown heading. Each <section> below is a single contiguous
     HTML block (no blank lines inside) so goldmark passes it through verbatim.
     No `---` thematic breaks: sections separate by whitespace alone.
     Styling lives in the static_page theme layer (.vault-index selectors). -->

<section class="hero" id="hero">
  <div class="hero-field" aria-hidden="true"><span class="line l1"></span><span class="line l2"></span><span class="line l3"></span><span class="node"></span></div>
  <div class="hero-copy">
    <h1 class="hero-title">A notebook that happens to sync.</h1>
    <p class="hero-lede">Self-hosted, real-time sync for Obsidian. Plain Markdown on disk, line-level merge, git-backed history &mdash; light enough to run on a <code>$5</code> VPS.</p>
    <div class="hero-cta">
      <a class="cta cta-primary" href="/notes/">Quick start<span class="arrow" aria-hidden="true">&rarr;</span></a>
      <a class="cta" href="/documentation/">Documentation<span class="arrow" aria-hidden="true">&rarr;</span></a>
    </div>
  </div>
</section>

<section class="stanzas">
  <div class="stanza"><h2>File-first</h2><p>Plain Markdown on disk &mdash; <code>rsync</code> your vault out anytime. Your files outlive the tool.</p></div>
  <div class="stanza"><h2>Real-time</h2><p>Sync on save, merged line by line. Onboarding is pasting a key.</p></div>
  <div class="stanza"><h2>Versioned</h2><p>Git-backed history. Tag what's reviewed, revert what isn't.</p></div>
</section>
