# Changelog

## 1.1.0 - 2026-07-15

- Extracted the Mermaid macro from RedMica UI extension 0.6.0 into a focused standalone plugin.
- Removed unrelated UI-extension features, settings, routes, controllers, database migrations, and helper patches.
- Updated the bundled Mermaid library from 11.12.1 to 11.16.0 and kept all assets local.
- Initialized Mermaid with `securityLevel: 'strict'`, `maxTextSize: 50000`, and `maxEdges: 1000`.
- Added automatic rendering for Redmine previews and AJAX-inserted content.
- Added client-side download of the normally rendered SVG, preserving HTML labels and the on-screen layout.
- Added transparent PNG clipboard copy using the browser image Clipboard API and origin-clean data URL rasterization.
- Limited PNG rasterization to a preferred 2x scale, 8192 pixels per side, and 64 million pixels.
- Used Redmine's standard download and copy-link sprite icons for the two export controls.
- Displayed the controls only on diagram hover or keyboard focus on mouse/trackpad devices, while keeping them visible on touch devices.
- Removed Office-specific SVG re-rendering so export no longer changes `htmlLabels` or diagram layout.
- Standardized all plugin-specific user-facing and diagnostic messages in English.
