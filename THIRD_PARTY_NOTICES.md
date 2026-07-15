# Third-party notices

## RedMica UI extension

The Mermaid macro implementation was derived from the Mermaid portion of
`redmica/redmica_ui_extension`, maintained by Far End Technologies Corporation.

- Original project: https://github.com/redmica/redmica_ui_extension
- Original plugin version used as a reference: 0.6.0
- License: GNU General Public License version 2

The derivative removes the searchable select box, burndown chart, attachment
preview, settings patch, helper patches, settings UI, and all related assets.
It adds automatic rendering of dynamically inserted content and client-side SVG
export.

## Mermaid

This plugin bundles Mermaid 11.16.0 as `mermaid.min.js`.

- Project: https://github.com/mermaid-js/mermaid
- License: MIT
- Bundled file SHA-256:
  `74d7c46dabca328c2294733910a8aa1ed0c37451776e8d5295da38a2b758fb9b`

The Mermaid bundle includes software under additional compatible licenses,
including DOMPurify under Mozilla Public License 2.0. The MPL 2.0 text is
included as `LICENSE.MPL-2.0`. License notices embedded in `mermaid.min.js` are
retained.
