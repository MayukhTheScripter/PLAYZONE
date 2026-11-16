// Sharing and copying helpers.
//
// Browsers differ a lot here:
//  - navigator.share      -> only some phones / browsers (the native share sheet)
//  - navigator.clipboard  -> needs a "secure context" (https or localhost). It is
//                            NOT available on http://192.168.x.x (LAN testing).
//  - document.execCommand -> old but works almost everywhere, even on plain http.
// So every action tries the best option first and falls back step by step.

/** Copy text to the clipboard. Returns true if it worked. */
export async function copyText(text) {
  // 1) Modern API
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to the old method */ }

  // 2) Old method: select the text in a hidden textarea and run "copy"
  try {
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px;';
    document.body.appendChild(box);
    box.focus();
    box.select();
    box.setSelectionRange(0, text.length); // needed on iOS
    const ok = document.execCommand('copy');
    box.remove();
    return ok;
  } catch {
    return false;
  }
}

/** The link a friend can open to land in this room. Never hard-codes a host. */
export function roomLink(code) {
  return location.origin + location.pathname + '#/lobby/' + code;
}

/**
 * Share a room. Returns one of:
 *   'shared'    – the native share sheet was used
 *   'cancelled' – the user closed the share sheet (not an error)
 *   'copied'    – link copied to the clipboard instead
 *   'failed'    – nothing worked; show the link so it can be copied by hand
 */
export async function shareRoom(code) {
  const url = roomLink(code);
  const text = 'Join my PLAYZONE room with code ' + code;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Join my PLAYZONE room', text, url });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      // any other error: fall through to copying
    }
  }
  return (await copyText(text + '\n' + url)) ? 'copied' : 'failed';
}
