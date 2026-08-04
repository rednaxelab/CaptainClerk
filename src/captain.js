/********************************CAPTAIN.JS******************************************************
 * Extension-wide, page-context-aware features that don't belong to a specific Clerk feature.
 * Loaded after registry.js (Hotkeys must exist before register() is called).
 *************************************************************************************************/

let tax_return_side_bar_hidden = false;

{
  const tax_return_window = new URLSearchParams(window.location.search).get('splitViewEnabled') === 'true'; // true on the tax return split-view viewer page

  if (tax_return_window) {
    Hotkeys.register('ctrl+shift+L', () => {
      const sidebar = document.querySelector('div.sidebar');
      if (!sidebar) return;
      // Equivalent to the original if/else: flip the flag, apply the same new value to .hidden.
      tax_return_side_bar_hidden = !tax_return_side_bar_hidden;
      sidebar.hidden = tax_return_side_bar_hidden;
    }, 'Captain: Toggle tax return sidebar');
  }
}
