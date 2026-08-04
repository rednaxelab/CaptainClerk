/********************************CAPTAIN.JS******************************************************
 * Extension-wide, page-context-aware features that don't belong to a specific Clerk feature.
 * Loaded after registry.js (Hotkeys must exist before register() is called).
 *************************************************************************************************/

let tax_return_side_bar_hidden = false;

/***************************SINGLE-PAGE MODE*****************************************************
 * ProConnect renders a form's pages continuously (all pages stacked, scroll to move between
 * them). This overlays an alternate mode: hide every page except one at a time.
 *
 * Structure this depends on (confirmed against a live captured form):
 *   div.main-content                          <- actual scrolling ancestor
 *     div.tax-return-form
 *       div                                   <- wrapper, one per page (no class of its own)
 *         div.page-number                     <- "page#N" label
 *         div.tax-form-page[data-pagenumber]  <- the rendered <svg class="taxform"> page itself
 *
 * We hide/show the outer per-page wrapper (parent of .tax-form-page), not .tax-form-page alone,
 * so each page's own "page#N" label travels with it as a free "you are here" indicator.
 *
 * Deliberately stateless across toggles: every time single-page mode is turned ON, the page
 * list is re-queried fresh from the DOM and starts at page 1. It does NOT try to track or
 * restore a specific page across a form switch, and does NOT watch for new pages being mounted
 * while active (e.g. via MutationObserver) -- switching forms while active simply reverts to
 * native continuous view until re-toggled. This trade favors simplicity/robustness over a more
 * "complete" experience that would need to reliably distinguish a genuine form switch from the
 * DOM churn that already happens during ordinary scrolling within the same form.
 ***************************************************************************************************/

let single_page_mode_active = false;
let single_page_wrappers = [];
let single_page_index = 0;

function get_single_page_wrappers() {
  return Array.from(document.querySelectorAll('.tax-form-page'))
    .map(el => el.parentElement)
    .filter(Boolean);
}

function show_only_single_page(index) {
  single_page_wrappers.forEach((wrapper, i) => {
    wrapper.style.display = (i === index) ? '' : 'none';
  });
}

function enable_single_page_mode() {
  single_page_wrappers = get_single_page_wrappers();
  if (single_page_wrappers.length === 0) return; // no pages found -- nothing to do
  single_page_index = 0;
  show_only_single_page(single_page_index);
  single_page_mode_active = true;
}

function disable_single_page_mode() {
  single_page_wrappers.forEach(wrapper => {
    wrapper.style.display = '';
  });
  single_page_mode_active = false;
  single_page_wrappers = [];
  single_page_index = 0;
}

{
  const tax_return_window = new URLSearchParams(window.location.search).get('splitViewEnabled') === 'true'; // true on the tax return split-view viewer page

  if (tax_return_window) {
    // Ctrl/Cmd + Shift + L -- toggle sidebar visibility, and in lockstep, single-page mode.
    // Hiding the sidebar (freeing screen space) turns single-page mode ON; showing it again
    // turns single-page mode OFF and reverts to native continuous scrolling.
    Hotkeys.register('ctrl+shift+L', () => {
      const sidebar = document.querySelector('div.sidebar');
      if (!sidebar) return;
      tax_return_side_bar_hidden = !tax_return_side_bar_hidden;
      sidebar.hidden = tax_return_side_bar_hidden;
      if (tax_return_side_bar_hidden) {
        enable_single_page_mode();
      } else {
        disable_single_page_mode();
      }
    }, 'Captain: Toggle tax return sidebar + single-page mode');

    // Alt + Shift + Down/Up Arrow -- next/previous page, only while single-page mode is active.
    // Deliberately NOT bare arrow keys or PageDown/PageUp: those have real native meaning
    // (cursor movement, native scrolling) that would need suppressing on every keystroke even
    // when single-page mode is off. This combo has no native meaning, so if the mode-check
    // below is ever wrong, the failure mode is "does nothing" rather than "breaks something else."
    Hotkeys.register('alt+shift+ArrowDown', () => {
      if (!single_page_mode_active || single_page_wrappers.length === 0) return;
      single_page_index = Math.min(single_page_index + 1, single_page_wrappers.length - 1);
      show_only_single_page(single_page_index);
    }, 'Captain: Next page (single-page mode)');

    Hotkeys.register('alt+shift+ArrowUp', () => {
      if (!single_page_mode_active || single_page_wrappers.length === 0) return;
      single_page_index = Math.max(single_page_index - 1, 0);
      show_only_single_page(single_page_index);
    }, 'Captain: Previous page (single-page mode)');
  }
}
