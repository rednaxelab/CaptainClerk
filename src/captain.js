/********************************CAPTAIN.JS******************************************************
 * Extension-wide, page-context-aware features that don't belong to a specific Clerk feature.
 * Loaded after registry.js (Hotkeys must exist before register() is called).
 *************************************************************************************************/

let tax_return_side_bar_hidden = false;

/***************************SINGLE-PAGE MODE*****************************************************
 * ProConnect renders a form's pages continuously (all pages stacked, scroll to move between
 * them). This overlays an alternate mode: hide everything except one page at a time.
 *
 * Structure this depends on (confirmed against a live captured form, full ancestor chain):
 *   div.tax-return-page.companion-standalone.split-view  <- isolation root: everything ABOVE
 *                                                            this is persistent app-wide shell
 *                                                            (nav, etc.), left untouched.
 *     div.page-layout
 *       div.content-container
 *         div.content-wrapper
 *           div.main-content-wrapper.check-return
 *             div.main-content                            <- actual scrolling ancestor
 *               div.check-return-content
 *                 div.scrollable
 *                   div.scrollable-content.content-padding
 *                     div.tax-return-form
 *                       h3                                 <- form title
 *                       div.Stack-wrapper-3c3d613          <- "choose highlighted items..." legend
 *                       div                                 <- wrapper, one per page (no class)
 *                         div.page-number                    <- "page#N" label
 *                         div.tax-form-page[data-pagenumber]  <- rendered <svg class="taxform"> page
 *                       div (more page wrappers, repeating)
 *               [footer widget, sibling of .check-return-content under .main-content]
 *   div.details-wrapper.details-wrapper-responsive  <- client-info/header toolbar; structural
 *                                                       location relative to the root above is
 *                                                       not fully confirmed, so it's ALSO hidden
 *                                                       by name as a redundant fallback below.
 *
 * TWO hiding mechanisms, layered:
 *   1. General isolate: walking up from .tax-return-form to the isolation root, hiding every
 *      sibling encountered at each level. This is what catches the footer, and anything else
 *      sharing an ancestor with the form without needing to be named -- the whole point being
 *      this shouldn't need updating as ProConnect adds/moves chrome around the form.
 *   2. Allowlist within .tax-return-form: every direct child is hidden except whichever page
 *      wrapper is currently showing (title, legend, other pages -- all covered by one rule).
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
let single_page_isolated = []; // {element, previous_display} hidden by isolate_element, for precise restore

function get_tax_return_form_container() {
  return document.querySelector('.tax-return-form');
}

function get_isolation_root() {
  return document.querySelector('.tax-return-page.companion-standalone.split-view');
}

function get_header_toolbar() {
  return document.querySelector('.details-wrapper.details-wrapper-responsive');
}

// Sets .tax-return-form's min-height to the viewport height, so there's actual leftover
// vertical space for justify-content:center to distribute. Deliberately uses window.innerHeight,
// NOT .main-content's measured height: .main-content isn't independently fixed to the viewport,
// it grows to fit ITS OWN content -- which includes .tax-return-form. Measuring it and using
// that to set .tax-return-form's height created a feedback loop (each cycle made both taller).
// window.innerHeight can never be affected by our own DOM changes, so no loop is possible.
function sync_single_page_form_height() {
  const form = get_tax_return_form_container();
  if (!form) return;
  form.style.minHeight = window.innerHeight + 'px';
}

function get_single_page_wrappers() {
  return Array.from(document.querySelectorAll('.tax-form-page'))
    .map(el => el.parentElement)
    .filter(Boolean);
}

// Walks up from `target` to (but not including) `root`, hiding every sibling encountered at
// each level along the way. Returns the list of what was hidden (with each element's PRIOR
// display value, not just assumed empty) so it can be precisely restored later.
function isolate_element(target, root) {
  const hidden = [];
  let node = target;
  while (node && node !== root && node.parentElement) {
    const parent = node.parentElement;
    Array.from(parent.children).forEach(sibling => {
      if (sibling !== node) {
        hidden.push({ element: sibling, previous_display: sibling.style.display });
        sibling.style.display = 'none';
      }
    });
    node = parent;
  }
  return hidden;
}

function restore_isolated(hidden) {
  hidden.forEach(({ element, previous_display }) => {
    element.style.display = previous_display;
  });
}

// Hides every direct child of .tax-return-form except the page wrapper at `index` --
// the allowlist: only the current page stays visible, everything else (title, legend,
// other pages) is hidden without needing to be named individually.
function show_only_single_page(index) {
  const container = get_tax_return_form_container();
  if (!container) return;
  const current_wrapper = single_page_wrappers[index];
  Array.from(container.children).forEach(child => {
    child.style.display = (child === current_wrapper) ? '' : 'none';
  });
}

function enable_single_page_mode() {
  single_page_wrappers = get_single_page_wrappers();
  if (single_page_wrappers.length === 0) return; // no pages found -- nothing to do
  single_page_index = 0;
  show_only_single_page(single_page_index);

  const container = get_tax_return_form_container();
  const root = get_isolation_root();
  if (container && root) {
    single_page_isolated = isolate_element(container, root);
  }

  // Redundant fallback in case the header isn't actually covered by the isolate walk above --
  // harmless if it's already hidden (setting display:none twice is a no-op).
  const header = get_header_toolbar();
  if (header) header.style.display = 'none';

  // Center the page. Root cause of the earlier shrink (both align-items:center AND margin:auto
  // alone): per the flexbox spec, auto margins on a flex item's cross-axis disable
  // align-items:stretch for THAT item specifically -- it falls back to its natural/unstretched
  // size instead of growing to its max-width. Fix: give the wrapper an explicit width (100%,
  // capped by its own existing max-width:980px) so it isn't depending on stretch to size itself
  // at all -- then margin:auto can center that already-correctly-sized box without conflict.
  single_page_wrappers.forEach(wrapper => {
    wrapper.style.width = '100%';
    wrapper.style.margin = '0 auto';
    // ProConnect's own CSS gives the wrapper flex-grow:1 -- harmless/invisible under native
    // continuous scroll (no leftover space to grow into), but once min-height below gives
    // .tax-return-form real leftover height, this rule claims all of it for the wrapper
    // itself, leaving nothing for justify-content to center with. Override to 0.
    wrapper.style.flexGrow = '0';
  });

  // Vertical centering: .tax-return-form is flex-direction:column, so justify-content controls
  // this axis correctly (no axis-confusion trap here, unlike the horizontal case). But it needs
  // actual leftover space to distribute -- by default the container just shrinks to fit its one
  // visible child, same root shape as the horizontal shrink. min-height, kept in sync with the
  // viewport via a resize listener, supplies that space -- see sync_single_page_form_height for
  // why window.innerHeight is used instead of measuring .main-content (a feedback loop).
  if (container) {
    container.style.justifyContent = 'center';
  }
  window.addEventListener('resize', sync_single_page_form_height);
  sync_single_page_form_height(); // set immediately -- don't wait for the first resize event

  single_page_mode_active = true;
}

function disable_single_page_mode() {
  const container = get_tax_return_form_container();
  if (container) {
    Array.from(container.children).forEach(child => {
      child.style.display = '';
    });
    container.style.justifyContent = '';
    container.style.minHeight = '';
  }
  window.removeEventListener('resize', sync_single_page_form_height);
  single_page_wrappers.forEach(wrapper => {
    wrapper.style.width = '';
    wrapper.style.margin = '';
    wrapper.style.flexGrow = '';
  });
  restore_isolated(single_page_isolated);
  single_page_isolated = [];
  const header = get_header_toolbar();
  if (header) header.style.display = '';
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

    // PageDown/PageUp -- next/previous page, but ONLY while single-page mode is active (guard).
    // When single-page mode is off, the guard returns false, so these keys are left completely
    // untouched and scroll the continuous view natively -- a fitting default either way.
    Hotkeys.register('PageDown', () => {
      single_page_index = Math.min(single_page_index + 1, single_page_wrappers.length - 1);
      show_only_single_page(single_page_index);
    }, 'Captain: Next page (single-page mode)', {
      guard: () => single_page_mode_active && single_page_wrappers.length > 0
    });

    Hotkeys.register('PageUp', () => {
      single_page_index = Math.max(single_page_index - 1, 0);
      show_only_single_page(single_page_index);
    }, 'Captain: Previous page (single-page mode)', {
      guard: () => single_page_mode_active && single_page_wrappers.length > 0
    });

    // Home/End -- jump to first/last page. Same guard pattern: only claimed while single-page
    // mode is active, otherwise left untouched (native Home/End scrolling behavior applies).
    Hotkeys.register('Home', () => {
      single_page_index = 0;
      show_only_single_page(single_page_index);
    }, 'Captain: Jump to first page (single-page mode)', {
      guard: () => single_page_mode_active && single_page_wrappers.length > 0
    });

    Hotkeys.register('End', () => {
      single_page_index = single_page_wrappers.length - 1;
      show_only_single_page(single_page_index);
    }, 'Captain: Jump to last page (single-page mode)', {
      guard: () => single_page_mode_active && single_page_wrappers.length > 0
    });

    // Alt+Shift+1..9 -- jump directly to page N (1-indexed, matching the visible "page#N" label).
    // No-op if that page doesn't exist. NOTE: Ctrl/Cmd+1-9 was the original ask, but those combos
    // are reserved by Chrome itself for switching browser tabs by position -- that's handled
    // above the page's own JavaScript, so a content script can never intercept it. Alt+Shift+N
    // matches this project's existing modifier convention and isn't reserved by Chrome or (on
    // standard layouts) used for typed characters.
    for (let n = 1; n <= 9; n++) {
      Hotkeys.register(`alt+shift+${n}`, () => {
        const target_index = n - 1; // page #N is 1-indexed; array is 0-indexed
        if (target_index >= single_page_wrappers.length) return; // that page doesn't exist -- no-op
        single_page_index = target_index;
        show_only_single_page(single_page_index);
      }, `Captain: Jump to page ${n} (single-page mode)`, {
        guard: () => single_page_mode_active && single_page_wrappers.length > 0
      });
    }
  }
}
