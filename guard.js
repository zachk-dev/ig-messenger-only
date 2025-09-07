// guard.js — enforce DMs only + hide tempting UI

const ALLOWED = [
  /^\/direct\/?/,
  /^\/accounts\//, // allow login/password pages
  /^\/p\/.*/
];

function isAllowedPath(path) {
  return ALLOWED.some(rx => rx.test(path));
}

function enforce() {
  const { pathname } = location;
  if (!isAllowedPath(pathname)) {
    location.assign("https://www.instagram.com/direct/inbox/");
    return;
  }
  if (!/^\/direct\/?/.test(pathname)) {
    document.documentElement.style.overflow = "hidden";
    if (document.body) document.body.style.overflow = "hidden";
  }
}

// ----- Hide nav temptations -----
const HIDE_SELECTORS = [
  // Common aria-labels
  '[aria-label="Home"]',
  '[aria-label="Reels"]',
  '[aria-label="Search"]',
  '[aria-label="Explore"]',
  '[aria-label="Profile"]',

  // href-based selectors
  'a[href="/"]',
  'a[href="/reels/"]',
  'a[href^="/reels"]',
  'a[href="/explore/"]',
  'a[href^="/explore"]',
  'a[href="/search/"]',
  'a[href^="/search"]',

  // profile links often match /username
  'a[href^="/"][role="link"]:not([href^="/direct"])'
];

function hideClickableAncestor(el) {
  const clickable = el.closest('a, button, div[role="button"], div[role="link"]') || el;
  if (!clickable.dataset.igmoHidden) {
    clickable.style.setProperty('display', 'none', 'important');
    clickable.dataset.igmoHidden = '1';
  }
}

function hideTemptations(root = document) {
  HIDE_SELECTORS.forEach(sel => {
    root.querySelectorAll(sel).forEach(hideClickableAncestor);
  });

  // fallback: text labels
  root.querySelectorAll('*').forEach(node => {
    if (node.dataset?.igmoHidden) return;
    const txt = (node.textContent || '').trim().toLowerCase();
    if (!txt) return;
    if (['home', 'reels', 'explore', 'search', 'profile'].includes(txt)) {
      hideClickableAncestor(node);
    }
  });
}

// Observe DOM changes
const mo = new MutationObserver(muts => {
  for (const m of muts) {
    if (m.addedNodes && m.addedNodes.length) {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1) hideTemptations(n);
      });
    }
  }
});

// Hook SPA history
(function hookHistory() {
  const _push = history.pushState;
  const _replace = history.replaceState;
  history.pushState = function (...args) { const r = _push.apply(this, args); enforce(); hideTemptations(); return r; };
  history.replaceState = function (...args) { const r = _replace.apply(this, args); enforce(); hideTemptations(); return r; };
  window.addEventListener('popstate', () => { enforce(); hideTemptations(); }, true);
})();

// Intercept in-site clicks
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  try {
    const url = new URL(a.href, location.href);
    if (url.hostname.endsWith('instagram.com') && !isAllowedPath(url.pathname)) {
      e.preventDefault();
      location.assign('https://www.instagram.com/direct/inbox/');
    }
  } catch {}
}, true);

// Init
(function init() {
  enforce();
  hideTemptations();
  mo.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(() => { enforce(); hideTemptations(); }, 2000);
})();