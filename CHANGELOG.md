# Changelog

## 1.1.0 - 2026-07-15

- Extracted the Mermaid macro from RedMica UI extension 0.6.0 into a focused standalone plugin.
- Removed unrelated UI-extension features, settings, routes, controllers, database migrations, and helper patches.
- Updated the bundled Mermaid library from 11.12.1 to 11.16.0 and kept all assets local.
- Initialized Mermaid with `securityLevel: 'strict'`, `maxTextSize: 50000`, and `maxEdges: 1000`.
- Added automatic rendering for Redmine previews and AJAX-inserted content.
- Added client-side SVG download for each diagram without a server-side download endpoint.
- Re-rendered exported diagrams with native SVG `text` and `tspan` labels instead of `foreignObject` for improved Microsoft PowerPoint compatibility.
- Preserved HTML labels for the on-screen Redmine rendering and Markdown bold text in exported SVG files.
- Replaced the text download control with Redmine's standard download sprite icon.
- Displayed the download icon only on diagram hover or keyboard focus on mouse/trackpad devices, while keeping it visible on touch devices.
- Standardized all plugin-specific user-facing and diagnostic messages in English.
