// ---------------------------------------------------------------------------
// ROUTER
// Uses the part of the address after "#" (for example  #/lobby/ABC12 ).
// Hash routes work on Netlify without any extra server settings.
//
// A route looks like:  { path: '/lobby/:code', page: LobbyPage }
// A page is a function  (params) => { element, destroy? }
// ---------------------------------------------------------------------------
import { mount } from './utils/dom.js';

let routes = [];
let outlet = null;
let current = null;

export function startRouter(container, routeList) {
  outlet = container;
  routes = routeList.map((r) => ({ ...r, parts: r.path.split('/').filter(Boolean) }));
  window.addEventListener('hashchange', render);
  render();
}

export function navigate(path) {
  if (location.hash === '#' + path) render();
  else location.hash = path;
}

function match(pathname) {
  const given = pathname.split('/').filter(Boolean);
  for (const route of routes) {
    if (route.parts.length !== given.length) continue;
    const params = {};
    const ok = route.parts.every((part, i) => {
      if (part.startsWith(':')) { params[part.slice(1)] = decodeURIComponent(given[i]); return true; }
      return part === given[i];
    });
    if (ok) return { route, params };
  }
  return null;
}

function render() {
  const pathname = (location.hash.slice(1) || '/').split('?')[0];
  const found = match(pathname) || match('/404');
  if (current && current.destroy) {
    try { current.destroy(); } catch (e) { console.error(e); }
  }
  current = null;
  const page = found.route.page(found.params);
  current = page;
  mount(outlet, page.element);
  window.scrollTo(0, 0);
}
