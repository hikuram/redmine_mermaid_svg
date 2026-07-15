# Redmine Mermaid SVG

A small Redmine plugin that adds a `{{mermaid ...}}` block macro, SVG download,
and PNG clipboard copy to each rendered diagram.

This plugin is a reduced derivative of the Mermaid macro in
[redmica/redmica_ui_extension](https://github.com/redmica/redmica_ui_extension).
It intentionally contains no settings screen, routes, controllers, database
migrations, model patches, helper patches, attachment preview, searchable
select box, or burndown chart.

## Requirements

- Redmine 6.0 or later
- A modern browser supported by Mermaid 11.16.0
- HTTPS or localhost for copying PNG images to the clipboard
- Browser support for the asynchronous image Clipboard API

Redmine 7.0 is within the declared version range, but this package has not been
run against the target Redmine installation as part of this build.

## Installation

1. Extract the directory as:

   ```text
   REDMINE_ROOT/plugins/redmine_mermaid_svg
   ```

2. Restart Redmine.

There are no migrations and no additional gems.

For a Docker image, a typical addition is:

```dockerfile
COPY --chown=redmine:redmine ./plugins/redmine_mermaid_svg \
    /usr/src/redmine/plugins/redmine_mermaid_svg
```

## Usage

```text
{{mermaid
flowchart LR
  A[Start] --> B[Finish]
}}
```

The diagram is rendered in issue descriptions, journals, wiki pages, and other
places where Redmine expands wiki macros. New content inserted by preview or
AJAX is detected with a scoped DOM observer and rendered automatically.

## Export controls

After rendering, each diagram exposes two Redmine-style icon buttons in the
upper-right corner. On mouse/trackpad devices they appear only while the diagram
is hovered or either control has keyboard focus; on touch devices they remain
visible. The hover behavior is implemented entirely in CSS.

### Download SVG

The download icon saves a clone of the SVG currently displayed in Redmine.
This preserves the diagram's normal Mermaid configuration, including
`htmlLabels: true`, `foreignObject` labels, Markdown formatting, and embedded
theme CSS. The export is entirely client-side:

- no download route or controller is added;
- no diagram is sent back to the server;
- percentage dimensions are replaced with the diagram `viewBox` dimensions
  when needed for use as a standalone SVG file.

The SVG is intended for browsers and SVG-aware graphics software. Applications
that do not support SVG `foreignObject`, including some Microsoft Office SVG
workflows, may omit HTML-based labels.

### Copy PNG to clipboard

The adjacent copy icon rasterizes the displayed SVG and writes a transparent
PNG image to the system clipboard. It preserves the browser-rendered HTML-label
appearance without changing the Mermaid layout. The SVG is loaded through a
self-contained data URL before canvas rendering so Chromium can export
`foreignObject` content without tainting the canvas. PNG output uses a preferred
2x scale and is automatically limited to 8192 pixels per side and 64 million
pixels to reduce excessive browser memory use.

Image clipboard access is available only in a secure browser context, normally
HTTPS or localhost, and requires browser support for `ClipboardItem` with
`image/png`. If the API is unavailable or permission is denied, the plugin
shows an English error message and logs the underlying error to the console.

## Security-related choices

- Mermaid is bundled locally; no CDN is contacted.
- Mermaid is initialized with `securityLevel: 'strict'`.
- `maxTextSize` is set to 50,000 characters.
- `maxEdges` is set to 1,000.
- No global prototypes or Redmine helper methods are modified.
- The macro body is passed through Rails `content_tag`, which HTML-escapes the
  source text before Mermaid reads it from the DOM.
- SVG download and PNG clipboard copy run entirely in the browser.

## Origin and license

The Redmine plugin code is distributed under GNU GPL v2. See `LICENSE` and
`THIRD_PARTY_NOTICES.md`.
