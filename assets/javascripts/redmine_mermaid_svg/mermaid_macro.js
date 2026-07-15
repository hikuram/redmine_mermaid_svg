(() => {
  'use strict';

  const DIAGRAM_SELECTOR = '.mermaid-macro .mermaid';
  const TOOLBAR_CLASS = 'mermaid-toolbar';
  const RENDERING_ATTRIBUTE = 'data-mermaid-rendering';
  const DISPLAY_CONFIG = {
    startOnLoad: false,
    securityLevel: 'strict',
    maxTextSize: 50000,
    maxEdges: 1000
  };
  const OFFICE_EXPORT_CONFIG = {
    ...DISPLAY_CONFIG,
    htmlLabels: false,
    flowchart: {
      htmlLabels: false
    }
  };
  const pendingElements = new Set();
  const diagramSources = new WeakMap();

  let initialized = false;
  let renderScheduled = false;
  let renderingQueue = Promise.resolve();
  let exportSequence = 0;

  function initializeMermaid() {
    if (initialized) {
      return true;
    }

    if (typeof globalThis.mermaid === 'undefined') {
      return false;
    }

    globalThis.mermaid.initialize(DISPLAY_CONFIG);

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
        if (!diagramSources.has(element)) {
          diagramSources.set(element, element.textContent || '');
        }

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
    const toolbar = wrapper?.querySelector(`:scope > .${TOOLBAR_CLASS}`);
    const button = toolbar?.querySelector('.mermaid-svg-download');

    if (!wrapper || !svg || !toolbar || !button) {
      return;
    }

    wrapper.classList.add('mermaid-download-ready');

    if (button.dataset.mermaidDownloadBound === 'true') {
      return;
    }

    button.dataset.mermaidDownloadBound = 'true';
    button.addEventListener('click', () => {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');

      renderingQueue = renderingQueue
        .then(() => downloadOfficeCompatibleSvg(element))
        .catch((error) => {
          console.error('Failed to export Mermaid SVG:', error);
          window.alert('Failed to save the SVG. Check the browser console for details.');
        })
        .finally(() => {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        });
    });
  }

  async function downloadOfficeCompatibleSvg(element) {
    const source = diagramSources.get(element);

    if (!source) {
      throw new Error('The original Mermaid source is not available.');
    }

    const svg = await renderOfficeCompatibleSvg(source);
    prepareStandaloneSvg(svg);

    if (svg.querySelector('foreignObject')) {
      throw new Error('Office-compatible export still contains foreignObject elements.');
    }

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

  async function renderOfficeCompatibleSvg(source) {
    const exportSource = forceSvgTextLabels(source);
    const renderId = `mermaid-office-export-${Date.now()}-${exportSequence += 1}`;

    globalThis.mermaid.initialize(OFFICE_EXPORT_CONFIG);

    try {
      const result = await globalThis.mermaid.render(renderId, exportSource);
      const documentNode = new DOMParser().parseFromString(
        result.svg,
        'image/svg+xml'
      );
      const parserError = documentNode.querySelector('parsererror');

      if (parserError) {
        throw new Error(parserError.textContent || 'Failed to parse exported SVG.');
      }

      return document.importNode(documentNode.documentElement, true);
    } finally {
      globalThis.mermaid.initialize(DISPLAY_CONFIG);
    }
  }

  function forceSvgTextLabels(source) {
    const htmlLabelsPattern = /(["']?htmlLabels["']?\s*:\s*)true\b/gi;
    const sourceWithOverrides = source.replace(htmlLabelsPattern, '$1false');

    return (
      '%%{init: {"htmlLabels":false,"flowchart":{"htmlLabels":false}}}%%\n' +
      sourceWithOverrides
    );
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
