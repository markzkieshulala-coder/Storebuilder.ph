/**
 * ULTRA-PREMIUM 3D WEBSITE SYSTEM GENERATOR
 * Core Module: Memory-Routing Virtual Systems
 * Mission: Eliminate all server-side 404 errors by virtualizing the entire
 *          client-side routing layer inside an isolated browser-memory file system.
 */

(function (global) {
  'use strict';

  // ============================================================
  // 1. VIRTUAL FILE SYSTEM REGISTRY
  // ============================================================

  if (!global.VirtualFileSystem) {
    global.VirtualFileSystem = {};
  }

  const VFS = global.VirtualFileSystem;
  const _historyStack = ['/home'];
  let _currentPath = '/home';
  let _transitionDuration = 360;
  let _isNavigating = false;

  // ============================================================
  // 2. VFS REGISTRATION API
  // ============================================================

  function registerVirtualPage(path, htmlContent, meta) {
    const normalized = _normalizePath(path);
    VFS[normalized] = {
      html: htmlContent,
      meta: meta || {},
      registeredAt: Date.now()
    };
    return normalized;
  }

  function registerMultiplePages(pagesMap) {
    const keys = [];
    for (const [path, content] of Object.entries(pagesMap)) {
      keys.push(registerVirtualPage(path, content));
    }
    return keys;
  }

  function unregisterVirtualPage(path) {
    const normalized = _normalizePath(path);
    delete VFS[normalized];
  }

  function pageExists(path) {
    return !!VFS[_normalizePath(path)];
  }

  function getPageContent(path) {
    const entry = VFS[_normalizePath(path)];
    return entry ? entry.html : null;
  }

  function getCurrentPath() {
    return _currentPath;
  }

  function getHistory() {
    return _historyStack.slice();
  }

  // ============================================================
  // 3. PATH NORMALIZATION UTILITIES
  // ============================================================

  function _normalizePath(path) {
    if (!path || typeof path !== 'string') return '/home';
    let p = path.trim();
    if (!p.startsWith('/')) p = '/' + p;
    p = p.replace(/\/+/g, '/');
    p = p.replace(/\/$/, '') || '/';
    return p;
  }

  function _resolveRelativePath(fromPath, targetHref) {
    if (!targetHref || targetHref.startsWith('#')) return null;
    if (targetHref.startsWith('http://') || targetHref.startsWith('https://') || targetHref.startsWith('mailto:') || targetHref.startsWith('tel:')) {
      return null;
    }
    if (targetHref.startsWith('/')) return _normalizePath(targetHref);

    const base = _normalizePath(fromPath);
    const baseParts = base.split('/').filter(Boolean);
    const targetParts = targetHref.split('/').filter(Boolean);

    for (const part of targetParts) {
      if (part === '..') {
        baseParts.pop();
      } else if (part !== '.' && part !== '') {
        baseParts.push(part);
      }
    }
    return '/' + baseParts.join('/');
  }

  // ============================================================
  // 4. DOM INJECTION & TRANSITION ENGINE
  // ============================================================

  function _findMountContainer() {
    let mount = document.querySelector('[data-vr-mount]');
    if (!mount) mount = document.getElementById('app-root');
    if (!mount) mount = document.getElementById('app');
    if (!mount) mount = document.querySelector('main');
    if (!mount) mount = document.body;
    return mount;
  }

  function _executeScriptsInContent(container) {
    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      if (oldScript.src) {
        newScript.src = oldScript.src;
        newScript.async = oldScript.async;
        newScript.defer = oldScript.defer;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }

  function _rebindInternalLinks(container) {
    const links = container.querySelectorAll('a[href]');
    links.forEach((link) => {
      if (link._vrBound) return;
      link._vrBound = true;
      link.addEventListener('click', _onAnchorClick);
    });
  }

  function _updateDocumentMeta(meta) {
    if (!meta) return;
    if (meta.title) document.title = meta.title;
    if (meta.description) {
      let desc = document.querySelector('meta[name="description"]');
      if (!desc) {
        desc = document.createElement('meta');
        desc.setAttribute('name', 'description');
        document.head.appendChild(desc);
      }
      desc.setAttribute('content', meta.description);
    }
  }

  function _performTransition(container, newHtml, direction) {
    return new Promise((resolve) => {
      container.style.transition = `opacity ${_transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${_transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      container.style.opacity = '0';
      container.style.transform = direction === 'forward'
        ? 'translate3d(0, -12px, -40px) scale(0.98)'
        : 'translate3d(0, 12px, -40px) scale(0.98)';

      setTimeout(() => {
        container.innerHTML = newHtml;
        _executeScriptsInContent(container);
        _rebindInternalLinks(container);
        window.scrollTo({ top: 0, behavior: 'auto' });

        requestAnimationFrame(() => {
          container.style.transform = direction === 'forward'
            ? 'translate3d(0, 12px, -40px) scale(0.98)'
            : 'translate3d(0, -12px, -40px) scale(0.98)';

          requestAnimationFrame(() => {
            container.style.opacity = '1';
            container.style.transform = 'translate3d(0, 0, 0) scale(1)';
            setTimeout(resolve, _transitionDuration);
          });
        });
      }, _transitionDuration);
    });
  }

  // ============================================================
  // 5. CORE NAVIGATION ENGINE
  // ============================================================

  async function navigateTo(targetPath, options) {
    if (_isNavigating) return false;
    const normalized = _normalizePath(targetPath);
    const entry = VFS[normalized];

    if (!entry) {
      console.warn(`[VirtualRouter] 404 — No virtual page registered at "${normalized}". Aborting navigation.`);
      return false;
    }

    _isNavigating = true;
    const opts = options || {};
    const direction = opts.direction || (normalized === _historyStack[_historyStack.length - 2] ? 'back' : 'forward');

    if (normalized !== _currentPath) {
      _historyStack.push(normalized);
      _currentPath = normalized;
    }

    const mount = _findMountContainer();
    await _performTransition(mount, entry.html, direction);
    _updateDocumentMeta(entry.meta);

    // Dispatch synthetic popstate-like event for analytics/tracking
    const navEvent = new CustomEvent('virtualnavigate', {
      detail: { path: normalized, previous: _historyStack[_historyStack.length - 2] || null, meta: entry.meta }
    });
    global.dispatchEvent(navEvent);

    _isNavigating = false;
    return true;
  }

  function goBack() {
    if (_historyStack.length < 2) return false;
    _historyStack.pop();
    const previous = _historyStack[_historyStack.length - 1];
    return navigateTo(previous, { direction: 'back' });
  }

  // ============================================================
  // 6. GLOBAL CLICK INTERCEPTOR
  // ============================================================

  function _onAnchorClick(event) {
    const link = event.currentTarget;
    const href = link.getAttribute('href');
    const resolved = _resolveRelativePath(_currentPath, href);

    if (!resolved) return;
    if (!pageExists(resolved)) return;

    event.preventDefault();
    event.stopPropagation();

    navigateTo(resolved);
  }

  function installGlobalInterceptor() {
    document.addEventListener('click', (event) => {
      const link = event.composedPath ? event.composedPath().find(el => el.tagName === 'A') : (event.target.closest ? event.target.closest('a') : null);
      if (!link || !link.hasAttribute('href')) return;

      const href = link.getAttribute('href');
      const resolved = _resolveRelativePath(_currentPath, href);
      if (!resolved) return;
      if (!pageExists(resolved)) return;

      event.preventDefault();
      event.stopPropagation();
      navigateTo(resolved);
    }, true);
  }

  function bindContainerLinks(container) {
    if (!container) container = document.body;
    const links = container.querySelectorAll('a[href]');
    links.forEach((link) => {
      if (link._vrBound) return;
      link._vrBound = true;
      link.addEventListener('click', _onAnchorClick);
    });
  }

  // ============================================================
  // 7. PREVIEW IFRAME BRIDGE
  // ============================================================

  function injectIntoPreviewFrame(iframe) {
    if (!iframe || !iframe.contentWindow) return false;
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;

    if (!win.VirtualFileSystem) {
      win.VirtualFileSystem = {};
    }

    // Serialize current VFS into the iframe
    for (const [path, entry] of Object.entries(VFS)) {
      win.VirtualFileSystem[path] = entry;
    }

    // Inject router script into iframe
    const routerScript = doc.createElement('script');
    routerScript.textContent = `
      (function(){
        var VFS = window.VirtualFileSystem || {};
        var currentPath = '/home';
        var historyStack = ['/home'];
        var isNavigating = false;
        var transitionDuration = 360;

        function normalizePath(p) {
          if (!p || typeof p !== 'string') return '/home';
          var s = p.trim();
          if (s.charAt(0) !== '/') s = '/' + s;
          s = s.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
          return s;
        }

        function resolveRelative(from, target) {
          if (!target || target.indexOf('#') === 0) return null;
          if (/^(https?:|mailto:|tel:)/.test(target)) return null;
          if (target.charAt(0) === '/') return normalizePath(target);
          var baseParts = normalizePath(from).split('/').filter(Boolean);
          var targetParts = target.split('/').filter(Boolean);
          for (var i = 0; i < targetParts.length; i++) {
            var part = targetParts[i];
            if (part === '..') baseParts.pop();
            else if (part !== '.' && part !== '') baseParts.push(part);
          }
          return '/' + baseParts.join('/');
        }

        function performTransition(container, newHtml, direction) {
          return new Promise(function(resolve) {
            container.style.transition = 'opacity ' + transitionDuration + 'ms cubic-bezier(0.4,0,0.2,1), transform ' + transitionDuration + 'ms cubic-bezier(0.4,0,0.2,1)';
            container.style.opacity = '0';
            container.style.transform = direction === 'forward'
              ? 'translate3d(0,-12px,-40px) scale(0.98)'
              : 'translate3d(0,12px,-40px) scale(0.98)';

            setTimeout(function() {
              container.innerHTML = newHtml;
              var scripts = container.querySelectorAll('script');
              scripts.forEach(function(oldScript) {
                var ns = document.createElement('script');
                if (oldScript.src) { ns.src = oldScript.src; ns.async = oldScript.async; ns.defer = oldScript.defer; }
                else { ns.textContent = oldScript.textContent; }
                oldScript.parentNode.replaceChild(ns, oldScript);
              });
              window.scrollTo(0, 0);

              requestAnimationFrame(function() {
                container.style.transform = direction === 'forward'
                  ? 'translate3d(0,12px,-40px) scale(0.98)'
                  : 'translate3d(0,-12px,-40px) scale(0.98)';
                requestAnimationFrame(function() {
                  container.style.opacity = '1';
                  container.style.transform = 'translate3d(0,0,0) scale(1)';
                  setTimeout(resolve, transitionDuration);
                });
              });
            }, transitionDuration);
          });
        }

        async function navigateTo(targetPath, options) {
          if (isNavigating) return false;
          var normalized = normalizePath(targetPath);
          var entry = VFS[normalized];
          if (!entry) { console.warn('[VR-Preview] 404 at ' + normalized); return false; }
          isNavigating = true;
          var direction = (options && options.direction) || (normalized === historyStack[historyStack.length - 2] ? 'back' : 'forward');
          if (normalized !== currentPath) { historyStack.push(normalized); currentPath = normalized; }

          var mount = document.querySelector('[data-vr-mount]') || document.getElementById('app-root') || document.getElementById('app') || document.querySelector('main') || document.body;
          await performTransition(mount, entry.html, direction);

          if (entry.meta && entry.meta.title) document.title = entry.meta.title;
          var links = mount.querySelectorAll('a[href]');
          links.forEach(function(link) {
            if (link._vrBound) return;
            link._vrBound = true;
            link.addEventListener('click', function(ev) {
              var href = link.getAttribute('href');
              var resolved = resolveRelative(currentPath, href);
              if (!resolved || !VFS[resolved]) return;
              ev.preventDefault();
              ev.stopPropagation();
              navigateTo(resolved);
            });
          });

          isNavigating = false;
          return true;
        }

        document.addEventListener('click', function(ev) {
          var link = ev.target.closest ? ev.target.closest('a') : null;
          if (!link || !link.hasAttribute('href')) return;
          var href = link.getAttribute('href');
          var resolved = resolveRelative(currentPath, href);
          if (!resolved || !VFS[resolved]) return;
          ev.preventDefault();
          ev.stopPropagation();
          navigateTo(resolved);
        }, true);

        window.VirtualRouter = { navigateTo: navigateTo, pageExists: function(p){ return !!VFS[normalizePath(p)]; } };
        if (VFS['/home']) navigateTo('/home');
      })();
    `;
    doc.head.appendChild(routerScript);
    return true;
  }

  // ============================================================
  // 8. PUBLIC API
  // ============================================================

  global.VirtualRouter = {
    registerPage: registerVirtualPage,
    registerPages: registerMultiplePages,
    unregisterPage: unregisterVirtualPage,
    pageExists: pageExists,
    getPageContent: getPageContent,
    getCurrentPath: getCurrentPath,
    getHistory: getHistory,
    navigateTo: navigateTo,
    goBack: goBack,
    installInterceptor: installGlobalInterceptor,
    bindContainerLinks: bindContainerLinks,
    injectIntoPreviewFrame: injectIntoPreviewFrame,
    setTransitionDuration: (ms) => { _transitionDuration = ms; },
    getVFS: () => VFS
  };

  // Auto-install interceptor on main document when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installGlobalInterceptor);
  } else {
    installGlobalInterceptor();
  }

})(typeof window !== 'undefined' ? window : global);
