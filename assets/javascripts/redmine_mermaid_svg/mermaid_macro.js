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
  const PREFERRED_PNG_SCALE = 2;
  const MAX_PNG_DIMENSION = 8192;
  const MAX_PNG_PIXELS = 64_000_000;
  const pendingElements = new Set();
  const copyFeedbackTimers = new WeakMap();

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
        addExportButtons(element);
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

        addExportButtons(element);
      } catch (error) {
        console.error('Failed to render Mermaid diagram:', error);
      } finally {
        element.removeAttribute(RENDERING_ATTRIBUTE);
      }
    }
  }

  function addExportButtons(element) {
    const wrapper = element.closest('.mermaid-macro');
    const svg = element.querySelector('svg');
    const toolbar = wrapper?.querySelector(`:scope > .${TOOLBAR_CLASS}`);
    const downloadButton = toolbar?.querySelector('.mermaid-svg-download');
    const copyButton = toolbar?.querySelector('.mermaid-png-copy');

    if (!wrapper || !svg || !toolbar || !downloadButton || !copyButton) {
      return;
    }

    wrapper.classList.add('mermaid-export-ready');
    bindSvgDownloadButton(downloadButton, element);
    bindPngCopyButton(copyButton, element);
  }

  function bindSvgDownloadButton(button, element) {
    if (button.dataset.mermaidDownloadBound === 'true') {
      return;
    }

    button.dataset.mermaidDownloadBound = 'true';
    button.addEventListener('click', () => {
      try {
        downloadDisplayedSvg(element);
      } catch (error) {
        console.error('Failed to export Mermaid SVG:', error);
        window.alert('Failed to save the SVG. Check the browser console for details.');
      }
    });
  }

  function bindPngCopyButton(button, element) {
    if (button.dataset.mermaidCopyBound === 'true') {
      return;
    }

    button.dataset.mermaidCopyBound = 'true';
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');

      try {
        await copyDisplayedDiagramAsPng(element);
        showCopySuccess(button);
      } catch (error) {
        console.error('Failed to copy Mermaid diagram as PNG:', error);
        window.alert(
          'Failed to copy the diagram as PNG. Image clipboard access requires HTTPS and a compatible browser. Check the browser console for details.'
        );
      } finally {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    });
  }

  function downloadDisplayedSvg(element) {
    const svg = cloneDisplayedSvg(element);
    const serializedSvg = serializeSvg(svg);
    const blob = new Blob([serializedSvg], {
      type: 'image/svg+xml;charset=utf-8'
    });

    downloadBlob(blob, buildFilename(element, 'svg'));
  }

  async function copyDisplayedDiagramAsPng(element) {
    if (
      !globalThis.isSecureContext ||
      !navigator.clipboard?.write ||
      typeof globalThis.ClipboardItem === 'undefined'
    ) {
      throw new Error('The image clipboard API is unavailable in this context.');
    }

    // Pass the PNG promise directly to ClipboardItem and invoke clipboard.write
    // during the click handler. This preserves transient user activation while
    // the browser finishes rasterizing the SVG.
    const pngBlobPromise = renderDisplayedSvgToPngBlob(element);
    const clipboardItem = new globalThis.ClipboardItem({
      'image/png': pngBlobPromise
    });

    await navigator.clipboard.write([clipboardItem]);
  }

  async function renderDisplayedSvgToPngBlob(element) {
    const originalSvg = element.querySelector('svg');

    if (!originalSvg) {
      throw new Error('The rendered Mermaid SVG is not available.');
    }

    const svg = cloneDisplayedSvg(element);
    const {width, height} = getSvgDimensions(svg, originalSvg);
    const scale = calculatePngScale(width, height);

    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));

    // A Blob URL containing SVG foreignObject content taints Chromium's
    // canvas and prevents PNG export. A self-contained data URL remains
    // origin-clean while preserving the browser-rendered HTML labels.
    const image = await loadImage(createSvgDataUrl(serializeSvg(svg)));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width * scale));
    canvas.height = Math.max(1, Math.ceil(height * scale));

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('A 2D canvas context could not be created.');
    }

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.drawImage(image, 0, 0, width, height);

    return await canvasToPngBlob(canvas);
  }

  function cloneDisplayedSvg(element) {
    const originalSvg = element.querySelector('svg');

    if (!originalSvg) {
      throw new Error('The rendered Mermaid SVG is not available.');
    }

    const svg = originalSvg.cloneNode(true);
    prepareStandaloneSvg(svg);
    return svg;
  }

  function prepareStandaloneSvg(svg) {
    if (!svg.hasAttribute('xmlns')) {
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    if (svg.querySelector('[xlink\\:href]') && !svg.hasAttribute('xmlns:xlink')) {
      svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    }

    const viewBox = parseViewBox(svg.getAttribute('viewBox'));

    if (viewBox) {
      const width = svg.getAttribute('width');
      const height = svg.getAttribute('height');

      if (!width || width.includes('%')) {
        svg.setAttribute('width', String(viewBox.width));
      }

      if (!height || height.includes('%')) {
        svg.setAttribute('height', String(viewBox.height));
      }
    }

    svg.style.removeProperty('max-width');
    svg.style.removeProperty('width');
    svg.style.removeProperty('height');
  }

  function serializeSvg(svg) {
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      new XMLSerializer().serializeToString(svg)
    );
  }

  function createSvgDataUrl(serializedSvg) {
    const bytes = new TextEncoder().encode(serializedSvg);
    const chunks = [];
    const chunkSize = 0x8000;

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, offset + chunkSize);
      chunks.push(String.fromCharCode(...chunk));
    }

    return `data:image/svg+xml;base64,${btoa(chunks.join(''))}`;
  }

  function parseViewBox(viewBox) {
    if (!viewBox) {
      return null;
    }

    const values = viewBox
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    if (
      values.length !== 4 ||
      !Number.isFinite(values[2]) ||
      !Number.isFinite(values[3]) ||
      values[2] <= 0 ||
      values[3] <= 0
    ) {
      return null;
    }

    return {
      width: values[2],
      height: values[3]
    };
  }

  function getSvgDimensions(svg, originalSvg) {
    const viewBox = parseViewBox(svg.getAttribute('viewBox'));

    if (viewBox) {
      return viewBox;
    }

    const width = Number.parseFloat(svg.getAttribute('width'));
    const height = Number.parseFloat(svg.getAttribute('height'));

    if (
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0
    ) {
      return {width, height};
    }

    const bounds = originalSvg.getBoundingClientRect();

    if (bounds.width > 0 && bounds.height > 0) {
      return {
        width: bounds.width,
        height: bounds.height
      };
    }

    throw new Error('The SVG dimensions could not be determined.');
  }

  function calculatePngScale(width, height) {
    const dimensionScale = Math.min(
      MAX_PNG_DIMENSION / width,
      MAX_PNG_DIMENSION / height
    );
    const pixelScale = Math.sqrt(MAX_PNG_PIXELS / (width * height));

    return Math.max(
      Math.min(PREFERRED_PNG_SCALE, dimensionScale, pixelScale),
      Math.min(1, dimensionScale, pixelScale)
    );
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The SVG could not be rasterized.'));
      image.src = source;
    });
  }

  function canvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('The canvas did not produce a PNG image.'));
        }
      }, 'image/png');
    });
  }

  function downloadBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.hidden = true;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  function buildFilename(element, extension) {
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

    return `${baseName}-diagram-${diagramIndex}.${extension}`;
  }

  function showCopySuccess(button) {
    const previousTimer = copyFeedbackTimers.get(button);

    if (previousTimer) {
      window.clearTimeout(previousTimer);
    }

    const originalTitle = button.dataset.originalTitle || button.title;
    const originalLabel = button.dataset.originalLabel ||
      button.getAttribute('aria-label') ||
      originalTitle;

    button.dataset.originalTitle = originalTitle;
    button.dataset.originalLabel = originalLabel;
    button.title = 'PNG copied to clipboard';
    button.setAttribute('aria-label', 'PNG copied to clipboard');
    button.classList.add('mermaid-copy-complete');

    const timer = window.setTimeout(() => {
      button.title = originalTitle;
      button.setAttribute('aria-label', originalLabel);
      button.classList.remove('mermaid-copy-complete');
      copyFeedbackTimers.delete(button);
    }, 1600);

    copyFeedbackTimers.set(button, timer);
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
    document.addEventListener('DOMContentLoaded', start, {once: true});
  } else {
    start();
  }
})();
