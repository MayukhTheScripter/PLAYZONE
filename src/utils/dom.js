// A tiny helper to build HTML elements from JavaScript.
//   h('div', { class: 'card', onClick: fn }, 'text', otherElement)
// Using this instead of innerHTML means player names can never inject HTML.
export function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === false || value === null || value === undefined) continue;
    if (key === 'class') node.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
}

// Replace everything inside a container.
export function mount(container, ...children) {
  container.replaceChildren();
  appendChildren(container, children);
}

// Icon element: plain emoji text, or an inline <svg> string coming from a trusted game manifest.
export function iconEl(cls, icon, tag = 'span') {
  const el = document.createElement(tag);
  el.className = cls; el.setAttribute('aria-hidden', 'true');
  if (typeof icon === 'string' && icon.startsWith('<svg')) el.innerHTML = icon; else el.textContent = icon || '';
  return el;
}
