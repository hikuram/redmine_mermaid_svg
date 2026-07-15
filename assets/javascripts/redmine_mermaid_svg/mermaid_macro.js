(() => {
  'use strict';

  const DIAGRAM_SELECTOR = '.mermaid-macro .mermaid';
  const TOOLBAR_CLASS = 'mermaid-toolbar';
  const RENDERING_ATTRIBUTE = 'data-mermaid-rendering';
  const pendingElements = new Set();

  let initialized = false;
  let renderScheduled = false;
  let renderingQueue = Promise.resolve();

  function initializeMermaid() {
    if (initialized) {
      return true;
    }

    if (typeof globalThis.mermaid === 'undefined') {
      return false;
    }

    globalThis.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      maxTextSize: 50000,
      maxEdges: 1000
    });

    initialized = true;
    return true;
  }

  function collectMermaidElements(root) {
    if (!(root instanceof Element)) {
      return;
    }

    if (root.matches(DIAGRAM_SELECTOR)) {
      pendingElements.add(root);
    }

    root.querySelectorAll(DIAGRAM_SELECTOR).forEach((element) => {
      pendingElements.add(element);
    });
  }

  function scheduleRender() {
    if (renderScheduled) {
      return;
    }

    renderScheduled = true;

    window.setTimeout(() => {
      renderScheduled = false;
      const elements = Array.from(pendingElements);
      pendingElements.clear();

      renderingQueue = renderingQueue
        .then(() => renderMermaidElements(elements))
        .catch((error) => {
          console.error('Mermaid rendering failed:', error);
        });
    }, 0);
  }

  async function renderMermaidElements(elements) {
    if (!initializeMermaid()) {
      return;
    }

    for (const element of elements) {
      if (!element.isConnected) {
        continue;
      }

      if (element.dataset.processed === 'true') {
        addSvgDownloadButton(element);
        continue;
      }

      if (element.hasAttribute(RENDERING_ATTRIBUTE)) {
        continue;
      }

      element.setAttribute(RENDERING_ATTRIBUTE, 'true');

      try {
        await globalThis.mermaid.run({
          nodes: [element],
          suppressErrors: true
        });

        addSvgDownloadButton(element);
      } catch (error) {
        console.error('Failed to render Mermaid diagram:', error);
      } finally {
        element.removeAttribute(RENDERING_ATTRIBUTE);
      }
    }
  }

  function addSvgDownloadButton(element) {
    const wrapper = element.closest('.mermaid-macro');
    const svg = element.querySelector('svg');

    if (!wrapper || !svg || wrapper.querySelector(`:scope > .${TOOLBAR_CLASS}`)) {
      return;
    }

    const toolbar = document.createElement('div');
    toolbar.className = TOOLBAR_CLASS;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mermaid-svg-download';
    button.textContent = 'SVG保存';
    button.title = 'Mermaid図をSVG形式で保存';
    button.setAttribute('aria-label', button.title);

    button.addEventListener('click', () => {
      downloadMermaidSvg(element);
    });

    toolbar.appendChild(button);
    wrapper.insertBefore(toolbar, element);
  }

  function downloadMermaidSvg(element) {
    const sourceSvg = element.querySelector('svg');

    if (!sourceSvg) {
      return;
    }

    const svg = sourceSvg.cloneNode(true);
    prepareStandaloneSvg(svg);

    const serializedSvg =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      new XMLSerializer().serializeToString(svg);

    const blob = new Blob([serializedSvg], {
      type: 'image/svg+xml;charset=utf-8'
    });

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = buildSvgFilename(element);
    link.hidden = true;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  function prepareStandaloneSvg(svg) {
    if (!svg.hasAttribute('xmlns')) {
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    if (svg.querySelector('[xlink\\:href]') && !svg.hasAttribute('xmlns:xlink')) {
      svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    }

    const viewBox = svg.getAttribute('viewBox');

    if (viewBox) {
      const values = viewBox
        .trim()
        .split(/[\s,]+/)
        .map(Number);

      if (
        values.length === 4 &&
        Number.isFinite(values[2]) &&
        Number.isFinite(values[3])
      ) {
        const width = svg.getAttribute('width');
        const height = svg.getAttribute('height');

        if (!width || width.includes('%')) {
          svg.setAttribute('width', String(values[2]));
        }

        if (!height || height.includes('%')) {
          svg.setAttribute('height', String(values[3]));
        }
      }
    }

    svg.style.removeProperty('max-width');
    svg.style.removeProperty('width');
    svg.style.removeProperty('height');
  }

  function buildSvgFilename(element) {
    const heading =
      document.querySelector('#content h2')?.textContent?.trim() ||
      document.title ||
      'mermaid';

    const diagrams = Array.from(document.querySelectorAll(DIAGRAM_SELECTOR));
    const diagramIndex = Math.max(diagrams.indexOf(element) + 1, 1);

    let baseName = heading
      .normalize('NFKC')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .trim();

    if (!baseName) {
      baseName = 'mermaid';
    }

    baseName = baseName.slice(0, 80);

    return `${baseName}-diagram-${diagramIndex}.svg`;
  }

  function observeDynamicContent() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          collectMermaidElements(node);
        });
      }

      if (pendingElements.size > 0) {
        scheduleRender();
      }
    });

    const observationRoot = document.querySelector('#content') || document.body;

    observer.observe(observationRoot, {
      childList: true,
      subtree: true
    });
  }

  function start() {
    if (!initializeMermaid()) {
      console.error('Mermaid library is not available.');
      return;
    }

    document.querySelectorAll(DIAGRAM_SELECTOR).forEach((element) => {
      pendingElements.add(element);
    });

    scheduleRender();
    observeDynamicContent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
