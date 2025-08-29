// guard.js – enforce DMs in SPA navigations too

const ALLOWED = [
  /^\/direct\/?/,
  /^\/accounts\// // allow login/password pages so you don't get stuck
];

function isAllowedPath(path) {
  return ALLOWED.some(rx => rx.test(path));
}

function enforce() {
  const { pathname } = location;
  if (!isAllowedPath(pathname)) {
    // hard redirect to DM inbox
    location.assign("https://www.instagram.com/direct/inbox/");
    return;
  }
  // extra safety: if we're not on /direct/, prevent feed from being usable
  if (!/^\/direct\/?/.test(pathname)) {
    document.documentElement.style.overflow = "hidden";
    document.body && (document.body.style.overflow = "hidden");
  }
}

// Intercept SPA route changes
(function hookHistory() {
  const _push = history.pushState;
  const _replace = history.replaceState;

  history.pushState = function (...args) {
    const ret = _push.apply(this, args);
    enforce();
    return ret;
  };
  history.replaceState = function (...args) {
    const ret = _replace.apply(this, args);
    enforce();
    return ret;
  };

  window.addEventListener("popstate", enforce, true);
})();

// Intercept clicks on in-site links before navigation happens
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a[href]");
  if (!a) return;
  try {
    const url = new URL(a.href, location.href);
    if (url.hostname.endsWith("instagram.com") && !isAllowedPath(url.pathname)) {
      e.preventDefault();
      location.assign("https://www.instagram.com/direct/inbox/");
    }
  } catch {}
}, true);

// Run ASAP
enforce();

// Also re-check periodically in case IG mutates without history events
setInterval(enforce, 2000);