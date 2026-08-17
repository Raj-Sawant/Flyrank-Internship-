(function () {
  'use strict';

  // API_BASE is set to the origin of this script at runtime
  // so it works regardless of where the server is hosted
  function getApiBase() {
    const script = document.currentScript ||
      document.querySelector('script[data-widget-id]');
    if (script && script.src) {
      const url = new URL(script.src);
      return url.origin;
    }
    return 'http://localhost:3000';
  }

  function getWidgetId() {
    const scripts = document.querySelectorAll('script[data-widget-id]');
    for (const s of scripts) {
      const id = s.getAttribute('data-widget-id');
      if (id) return id;
    }
    // Fallback: parse query string of current script src
    const script = document.currentScript;
    if (script && script.src) {
      const url = new URL(script.src);
      return url.searchParams.get('widgetId');
    }
    return null;
  }

  async function loadConfig(apiBase, widgetId) {
    const res = await fetch(`${apiBase}/widgets/${widgetId}/config`);
    if (!res.ok) throw new Error('Failed to load widget config');
    return res.json();
  }

  function renderWidget(apiBase, config, container) {
    container.innerHTML = '';
    container.style.cssText = 'font-family:sans-serif;max-width:400px;padding:16px;border:1px solid #ddd;border-radius:8px;background:#fff;';

    const title = document.createElement('h3');
    title.textContent = config.name;
    title.style.cssText = 'margin:0 0 12px;font-size:18px;color:#333;';
    container.appendChild(title);

    const form = document.createElement('form');
    form.id = `widget-form-${config.id}`;

    // Render fields from config
    (config.fields || []).forEach(function (field) {
      const label = document.createElement('label');
      label.textContent = field.label;
      label.style.cssText = 'display:block;margin-bottom:4px;font-size:14px;color:#555;font-weight:500;';

      let input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 3;
      } else {
        input = document.createElement('input');
        input.type = field.type || 'text';
      }
      input.name = field.name;
      input.required = field.required || false;
      input.style.cssText = 'width:100%;padding:8px;margin-bottom:12px;box-sizing:border-box;border:1px solid #ccc;border-radius:4px;font-size:14px;';

      form.appendChild(label);
      form.appendChild(input);
    });

    // Honeypot field (hidden, must remain empty)
    const honeypot = document.createElement('input');
    honeypot.type = 'text';
    honeypot.name = 'honeypot';
    honeypot.autocomplete = 'off';
    honeypot.setAttribute('aria-hidden', 'true');
    honeypot.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
    honeypot.tabIndex = -1;
    form.appendChild(honeypot);

    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.textContent = config.button_text || 'Submit';
    btn.style.cssText = 'background:#0066cc;color:#fff;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;font-size:14px;transition:background 0.2s;';
    btn.onmouseenter = function () { btn.style.background = '#0052a3'; };
    btn.onmouseleave = function () { btn.style.background = '#0066cc'; };
    form.appendChild(btn);

    const status = document.createElement('p');
    status.id = `widget-status-${config.id}`;
    status.style.cssText = 'margin:8px 0 0;font-size:13px;min-height:20px;';
    form.appendChild(status);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      btn.disabled = true;
      btn.style.opacity = '0.7';
      status.style.color = '#555';
      status.textContent = 'Submitting...';

      const formData = new FormData(form);
      const data = {};
      for (const [key, value] of formData.entries()) {
        if (key !== 'honeypot') data[key] = value;
      }

      try {
        const res = await fetch(`${apiBase}/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widgetId: config.id,
            data: data,
            honeypot: formData.get('honeypot') || '',
          }),
        });
        if (res.ok) {
          status.style.color = '#2a7d2a';
          status.textContent = 'Thank you! Your submission was received.';
          form.reset();
        } else {
          const err = await res.json().catch(function () { return {}; });
          status.style.color = '#cc0000';
          status.textContent = err.error || 'Submission failed. Please try again.';
        }
      } catch (err) {
        status.style.color = '#cc0000';
        status.textContent = 'Network error. Please try again.';
      } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });

    container.appendChild(form);
  }

  async function init() {
    const widgetId = getWidgetId();
    if (!widgetId) {
      console.error('[Widget] No widget ID found — add data-widget-id attribute to the script tag');
      return;
    }

    const apiBase = getApiBase();

    // Find or create container
    let container = document.getElementById(`widget-container-${widgetId}`);
    if (!container) {
      container = document.createElement('div');
      container.id = `widget-container-${widgetId}`;
      // Insert after the script tag
      const script = document.currentScript || document.querySelector(`script[data-widget-id="${widgetId}"]`);
      if (script && script.parentNode) {
        script.parentNode.insertBefore(container, script.nextSibling);
      } else {
        document.body.appendChild(container);
      }
    }

    try {
      const config = await loadConfig(apiBase, widgetId);
      renderWidget(apiBase, config, container);
    } catch (err) {
      console.error('[Widget] Failed to initialize:', err.message);
      container.innerHTML = '<p style="color:#cc0000;font-family:sans-serif;font-size:14px;">Widget failed to load.</p>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
