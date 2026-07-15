# Redmine Mermaid SVG

A small Redmine plugin that adds a `{{mermaid ...}}` block macro and
Redmine's standard download icon to each rendered diagram.

This plugin is a reduced derivative of the Mermaid macro in
[redmica/redmica_ui_extension](https://github.com/redmica/redmica_ui_extension).
It intentionally contains no settings screen, routes, controllers, database
migrations, model patches, helper patches, attachment preview, searchable
select box, or burndown chart.

## Requirements

- Redmine 6.0 or later
- A modern browser supported by Mermaid 11.16.0

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

## SVG export

After rendering, each diagram exposes Redmine's standard download icon in the
upper-right corner. On mouse/trackpad devices it appears only while the diagram
is hovered or the control has keyboard focus; on touch devices it remains
visible. The hover behavior is implemented entirely in CSS. Export is entirely
client-side:

- no download route or controller is added;
- no diagram is sent back to the server;
- the original Mermaid source is retained in browser memory;
- export re-renders the diagram with `htmlLabels: false`;
- labels are emitted as native SVG `text` and `tspan` elements instead of
  XHTML inside `foreignObject`;
- percentage dimensions are replaced with the diagram `viewBox` dimensions
  when needed for use as a standalone SVG file.

This improves compatibility with Microsoft PowerPoint and other SVG consumers
that do not render `foreignObject`. The exported layout can differ slightly
from the on-screen diagram because the browser view continues to use the
diagram's normal HTML-label configuration. Markdown bold labels are retained.
CSS selectors that specifically target HTML elements such as `.nodeLabel p`
do not apply to the Office-compatible export.

## Security-related choices

- Mermaid is bundled locally; no CDN is contacted.
- Mermaid is initialized with `securityLevel: 'strict'`.
- `maxTextSize` is set to 50,000 characters.
- `maxEdges` is set to 1,000.
- No global prototypes or Redmine helper methods are modified.
- The macro body is passed through Rails `content_tag`, which HTML-escapes the
  source text before Mermaid reads it from the DOM.

## Origin and license

The Redmine plugin code is distributed under GNU GPL v2. See `LICENSE` and
`THIRD_PARTY_NOTICES.md`.
