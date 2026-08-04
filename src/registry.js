/********************************HOTKEY REGISTRY************************************************
 * Single shared registry for every keyboard shortcut across the extension. Each feature file
 * (captain.js, clerk.js, clerk_tabs.js, ...) calls Hotkeys.register(...) instead of attaching
 * its own document.addEventListener('keydown', ...) listener. This guarantees:
 *
 *   1. Exactly one keydown listener for the whole extension -- no duplicate/competing handlers.
 *   2. A collision (two features claiming the same physical key combo) is caught immediately
 *      at page-load time via alert(), instead of being discovered later by accident on
 *      whichever page happens to trigger both handlers.
 *   3. Hotkeys.list() can print/generate a live table of every registered combo, so docs
 *      never drift out of sync with the code.
 *
 * Must load BEFORE any file that calls Hotkeys.register() -- see manifest.json ordering.
 *
 * Combo string format: modifiers ("ctrl"/"cmd", "alt"/"option", "shift") plus exactly one key,
 * joined with "+", e.g. "ctrl+shift+v", "alt+shift+Z", "ctrl+alt+shift+v". "ctrl" matches either
 * Ctrl or Cmd (metaKey) automatically. A single letter or digit ("v", "0") is mapped to its
 * KeyboardEvent.code equivalent (KeyV, Digit0); anything else (ArrowDown, End, Delete) must be
 * passed using its exact e.code spelling.
 *************************************************************************************************/

const Hotkeys = (() => {
  const registry = new Map(); // signature -> { combo, label, handler, ctrl, alt, shift, code }

  function key_to_code(key) {
    if (/^[a-zA-Z]$/.test(key)) return `Key${key.toUpperCase()}`;
    if (/^[0-9]$/.test(key)) return `Digit${key}`;
    return key;
  }

  function parse_combo(combo) {
    const parts = combo.split('+').map(p => p.trim());
    const mods = { ctrl: false, alt: false, shift: false };
    let key = null;
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (lower === 'ctrl' || lower === 'cmd') mods.ctrl = true;
      else if (lower === 'alt' || lower === 'option') mods.alt = true;
      else if (lower === 'shift') mods.shift = true;
      else key = part;
    }
    if (!key) throw new Error(`Hotkeys.register: combo "${combo}" has no key.`);
    return { ...mods, code: key_to_code(key) };
  }

  function signature({ ctrl, alt, shift, code }) {
    return `${ctrl}|${alt}|${shift}|${code}`;
  }

  // Registers a hotkey. Throws (loudly, via alert -- not console, so it's impossible to miss
  // even if DevTools is never opened) if the exact combo is already claimed. This should only
  // ever fire due to a development-time mistake, never during normal use.
  function register(combo, handler, label = combo) {
    const parsed = parse_combo(combo);
    const sig = signature(parsed);
    const existing = registry.get(sig);
    if (existing) {
      const message = `Hotkey collision: "${combo}" is already registered as "${existing.label}". Cannot also register "${label}".`;
      alert(message);
      throw new Error(message);
    }
    registry.set(sig, { combo, label, handler, ...parsed });
  }

  // Returns every registered hotkey as a plain array -- useful for generating documentation
  // or a future in-app "keyboard shortcuts" panel.
  function list() {
    return Array.from(registry.values()).map(({ combo, label }) => ({ combo, label }));
  }

  document.addEventListener('keydown', async (e) => {
    if (e.repeat) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const sig = signature({ ctrl, alt: e.altKey, shift: e.shiftKey, code: e.code });
    const entry = registry.get(sig);
    if (!entry) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    await entry.handler(e);
  }, true);

  return { register, list };
})();
