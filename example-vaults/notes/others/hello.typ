= Hello, Typst

Welcome to a Typst document served by leyline-web. This file lives on
disk as plain `.typ` source and is rendered on demand by the `typst`
CLI in `--features html` mode.

== Why Typst

Typst is a markup-based typesetting system with a clean syntax for
structured documents — closer to Markdown than LaTeX, but with real
typesetting primitives.

== A short tour

Inline code looks like `let x = 1`, *strong* and _emphasis_ both work,
and links go to #link("https://typst.app/")[typst.app].

A list:

- First-class lists
- Nested structure works the same way
  - Like this
- And ordered lists too

A code block:

```rust
fn main() {
    println!("Hello from a Typst code block");
}
```

== Caveats in HTML mode

The HTML output target is experimental — some Typst features (custom
layout, complex math, page breaks) don't translate to a single HTML
document. For full-fidelity output, compile the same `.typ` locally
with `typst compile`.
