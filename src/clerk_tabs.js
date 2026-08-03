/********************************GLOBALS****************************************************/
const GLOBAL_TIMEOUT = 50; // allow for more if missing switches.

// Tracks the last real <input>/<select> that had focus. Needed because closing a flyout
// (see clerk.js autocomplete handling) can leave document.activeElement pointed at an
// invisible `[data-focus-guard]` element (no id) used by the flyout's focus trap, which would
// otherwise make paste_to_tabs think nothing is selected right after a dropdown pick.
let last_focused_id = '';
document.addEventListener('focusin', (e) => {
  const t = e.target;
  if (t && t.id && (t.tagName === 'INPUT' || t.tagName === 'SELECT')) {
    last_focused_id = t.id;
  }
}, true);

function get_active_input_id() {
  return document.activeElement?.id || last_focused_id;
}

/***************************HOTKEY REGISTRATION*********************************************/
document.addEventListener('keydown', async (e) => {
  // Allow for MacOS CMD (metaKey) key OR control key
  const cmdOrCtrl = e.ctrlKey || e.metaKey;
  // Check for auto-firing multiple times (holding keys)
  if (e.repeat) return;
  // Ctrl + Shift + Down Arrow (Navigate one tab left)
  if (cmdOrCtrl && e.shiftKey && e.code === 'ArrowDown') {
    e.preventDefault();
    await move_tab(1);
  }
  // Ctrl + Shift + Up Arrow (Navigate one tab right)
  if (cmdOrCtrl && e.shiftKey && e.code === 'ArrowUp') {
    e.preventDefault();
    await move_tab(-1);
  }
  // Alt + Shift + V (Paste TSV data in tabs -- ignoring zeroes)
  if (!(cmdOrCtrl) && e.altKey && e.shiftKey && e.code === 'KeyV') {
    e.preventDefault();
    await paste_to_tabs(true);
  }
  // Alt + Shift + Z (Paste TSV data in tabs -- enforcing zeroes and "")
  if (!(cmdOrCtrl) && e.altKey && e.shiftKey && e.code === 'KeyZ') {
    e.preventDefault();
    await paste_to_tabs(false);
  }
  // Alt + Shift + S (Sum all data)
  if (e.altKey && e.shiftKey && e.code === 'KeyS') {
    e.preventDefault();
    await sum_all_tabs();
  }
  // Alt + Shift + 0 (Clear data from all tabs same element as active element)
  if (e.altKey && e.shiftKey && e.code === 'Digit0') {
    e.preventDefault();
    await clear_all_tabs();
  }
  // Alt + Shift + L (Create TSV in clipboard of list data (K-1s, etc))
  if (e.altKey && e.shiftKey && e.code === 'KeyL') {
    e.preventDefault();
    await dump_full_list_data();
  }
  // Alt + Shift + C (Copy all tab values for active input, one per line, to clipboard -- backward for reconciliation)
  if (!(cmdOrCtrl) && e.altKey && e.shiftKey && e.code === 'KeyC') {
    e.preventDefault();
    await dump_all_tab_values();
  }
}, true);

/***************************MAIN IMPLEMENTATION FUNCTIONS***********************************/
async function get_selector_elements() {
  // Find "View All" selector
  const view_all_section = Array.from(document.querySelectorAll('span, div, button'))
    .find(el => el.textContent.trim() === 'View All');
  if (!view_all_section) {
    throw new Error('Could not find `View All` section of page.');
  }
  // Find the dropdown button
  const view_all_button = view_all_section.querySelector('button');
  if (!view_all_button) {
    throw new Error('Could not find button associated with `View All` section of page.');
  }
  // For below, we only need to click the dropdown button if not already expanded.
  if (view_all_button.getAttribute('aria-expanded') === 'false') {
    view_all_button.click();
    await new Promise(r => setTimeout(r, GLOBAL_TIMEOUT));
  }
  // Get and return all menu items as this is what we're mainly working with.
  const items = document.querySelectorAll('ul[class*="Menu-list"] span[id*="-Tab-tooltip-label-"]');
  return items;
}

async function click_list_item(element) {
  // The key here is closest actionable dropdown element. I observed DOM in order to pinpoint right element
  // for which you need to interact with.
  // Use the container or the span itself based on what worked earlier
  const trigger = element.closest('div[class*="action-actionTab"]') || element;
  trigger.scrollIntoView({ block: 'center' });
  trigger.focus();
  const cfg = { bubbles: true, cancelable: true, view: window, buttons: 1, composed: true };
  trigger.dispatchEvent(new MouseEvent('mousedown', cfg));
  await new Promise(r => setTimeout(r, GLOBAL_TIMEOUT));
  trigger.dispatchEvent(new MouseEvent('mouseup', cfg));
  trigger.click();
  // Allow time for ProTax 'ADS Authorize' network calls
  await new Promise(r => setTimeout(r, GLOBAL_TIMEOUT));
}

// Confirms a selection in a custom flyout/menu list using the same mousedown/mouseup/click
// sequence used elsewhere in this file for React-controlled menus (plain .click() alone
// doesn't reliably register as a "real" user selection).
async function click_menu_item(element) {
  element.scrollIntoView({ block: 'center' });
  const cfg = { bubbles: true, cancelable: true, view: window, buttons: 1, composed: true };
  element.dispatchEvent(new MouseEvent('mousedown', cfg));
  await new Promise(r => setTimeout(r, GLOBAL_TIMEOUT));
  element.dispatchEvent(new MouseEvent('mouseup', cfg));
  element.click();
  await new Promise(r => setTimeout(r, GLOBAL_TIMEOUT));
}

// Handles ProConnect's custom autocomplete/combobox <input> fields (e.g. depreciation method
// picker). These render a portal-based flyout <ul> keyed by data-flyout-trigger/data-flyout-area
// as you type -- setting .value directly or pressing Enter doesn't reliably commit the selection
// (Enter also jumps focus to the next field), so we type the leading code to filter the list,
// then click the matching rendered option directly.
async function set_autocomplete_value(text, element, autocomplete_button) {
  const raw = text.trim();
  // Options are formatted "NN = Description" -- match/type just the leading code,
  // same trick used for numeric-classed inputs in clerk.js.
  const search_code = raw.includes('=') ? raw.split('=')[0].trim() : raw;

  if (search_code === '') {
    element.setSelectionRange(0, element.value.length);
    document.execCommand('insertText', false, '');
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 5));
    element.blur();
    return;
  }

  const flyout_id = autocomplete_button.getAttribute('data-flyout-trigger');

  // Typing filters the flyout list live -- this is what actually opens/narrows it.
  element.setSelectionRange(0, element.value.length);
  document.execCommand('insertText', false, search_code);
  element.dispatchEvent(new Event('input', { bubbles: true }));

  let flyout;
  try {
    flyout = await wait_for_element(`[data-flyout-area="${flyout_id}"]`, 1500);
  } catch (err) {
    return;
  }

  // Selectable leaf items are wrapped in .input-menuWrapper-edafc68 (role="menuitem");
  // bare <li role="menuitem"> siblings without that wrapper are category headers, not options.
  const items = Array.from(flyout.querySelectorAll('.input-menuWrapper-edafc68[role="menuitem"]'));
  const target_item = items.find(item => {
    const label = item.textContent.trim();
    const label_code = label.split('=')[0].trim();
    return label_code.toLowerCase() === search_code.toLowerCase();
  });

  if (!target_item) {
    return;
  }

  await click_menu_item(target_item);
}

async function set_input_value(text, element) {
  element.focus();
  // Ported from Clerk class (clerk.js): native <select> handling.
  if (element.tagName === 'SELECT') {
    const options = Array.from(element.options);
    const search_str = text.trim().toLowerCase();
    let target_option;
    if (search_str === '') {
      // Blank paste/clear -- fall back to the first ("Select"/placeholder) option
      // since there's usually no option whose value or text is literally empty.
      target_option = null;
    } else {
      target_option = options.find(opt =>
        opt.value.toLowerCase() === search_str ||
        opt.text.trim().toLowerCase() === search_str ||
        opt.text.trim().toLowerCase().startsWith(`${search_str} =`) ||
        opt.text.trim().toLowerCase().startsWith(`${search_str}=`)
      );
    }
    if (target_option) {
      element.value = target_option.value;
    } else if (search_str === '') {
      element.selectedIndex = 0;
    }
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 5));
    element.blur();
    return;
  }

  // Custom autocomplete/combobox <input> (e.g. MACRS method picker): detected by a sibling
  // "autocomplete-control" button. Requires the type-and-click flow above, not a direct
  // value assignment.
  const autocomplete_button = element.closest('[class*="Input-wrapper"]')
    ?.querySelector('[data-testid="autocomplete-control"]');
  if (autocomplete_button) {
    await set_autocomplete_value(text, element, autocomplete_button);
    return;
  }

  // IMPLEMENTATION: We use legacy `execCommand` below... because it works. May want to play with other approaches.
  element.setSelectionRange(0, element.value.length); // select all text
  document.execCommand('insertText', false, text); // basically we're pasting new text
  // Necessary events to commit
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  // Give React time to "see" the final value before we kill focus
  await new Promise(r => setTimeout(r, 5));
  element.blur();
}


async function get_all_tab_names() {
  try {
    const items = await get_selector_elements();
    return Array.from(items).map(el => el.innerText.trim())
  } catch (err) {
    alert(`Could not find tab names: ${err}`);
  }
}

async function select_tab_by_index(idx) {
  const items = await get_selector_elements();
  const target_element = items[idx];
  if (!target_element) throw new Error(`No tab found at index ${idx}`);
  await click_list_item(target_element);
}

async function select_tab_by_name(name) {
  const idx = await get_tab_idx_by_name(name);
  await select_tab_by_index(idx);
}

async function get_active_tab() {
  // NOTE: the dropdown list has a specific icon for currently selected dropdown item. This is targeting that. We go up it tree, then query downward.
  const items = await get_selector_elements();
  for (const [idx, item] of items.entries()) {
    const row_container = item.closest(`span[class^=Menu-label-]`);
    let checkmark_container = row_container.querySelector('div[class^=tabs-checkmarkIcon-');
    // Below is what we're ultimately hunting. The icon for active selection. If it exists, return info on active tab.
    let active_icon = checkmark_container.querySelector(`[class^=Icon-icon-]`);
    if (active_icon) {
      const info = {
        name: item.innerText,
        idx: idx,
        len: items.length
      };
      return info;
    }
  }
}

async function get_tab_idx_by_name(name) {
  const names = await get_all_tab_names();
  const index = names.findIndex(n => n.toLowerCase().includes(name.toLowerCase()));
  if (index === -1) {
    throw new Error(`Tab with name "${name}" not found: ${names.join(', ')}`);
  }
  return index;
}

// Builds a selector matching either an <input> or <select> with the given id,
// escaping the id so special characters (colons, etc.) don't break the selector.
function build_element_selector(id) {
  const escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(id) : id;
  return `input#${escaped}, select#${escaped}`;
}

function wait_for_element(selector, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      const el = document.querySelector(selector);
      if (el) {
        return resolve(el);
      }
      if (Date.now() - startTime >= timeout) {
        return reject(new Error(`Timeout: Element [${selector}] not found after ${timeout}ms`));
      }
      // Check again in 50ms
      requestAnimationFrame(check);
    };
    check();
  });
}

async function read_clipboard() {
  // Matches Excel's parenthesis-negative format e.g. "(1.00)" and optional "$", commas, decimals
  const is_valid_number_string = (val) => {
    if (val === '' || val === '-' || val === '–') return true;
    return /^[\$\-\(]?\s*[\d,]+(\.\d+)?\s*\)?$/.test(val);
  };
  // Converts "(1.00)" -> "-1", "2.00" -> "2", strips $ and commas, rounds to whole number
  const format_number_string = (val) => {
    if (val === '' || val === '-' || val === '–') return '';
    const is_negative = val.includes('(') || val.includes('-');
    const num_only = val.replace(/[^\d.]/g, '');
    const parsed_float = parseFloat(num_only);
    const rounded = Math.round(parsed_float);
    return is_negative && rounded !== 0 ? `-${rounded}` : `${rounded}`;
  };

  const parse_tsv_data = (raw_data) => {
    const rows = raw_data.split(/\r?\n/);
    // drop only a single trailing blank line from the copy, not blanks in general
    if (rows.length > 1 && rows[rows.length - 1] === '') {
      rows.pop();
    }
    // Build raw matrix: strip non-breaking spaces, trim, and unwrap Excel's quoted cells
    const raw_matrix = rows.map(row => row.split('\t').map(cell => {
      let val = cell.replace(/\u00A0/g, ' ').trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).trim();
      }
      return val;
    }));

    // Per-column pass: only reformat columns that are cleanly numeric.
    // Blank-only columns and mixed/text columns are left untouched (no zeroing, no throwing).
    const col_count = raw_matrix[0].length;
    for (let c = 0; c < col_count; c++) {
      const col_values = raw_matrix.map(row => row[c]);
      const any_numeric_like = col_values.some(v => v !== '' && v !== '-' && v !== '–');
      if (!any_numeric_like) {
        continue; // all blank (or just dashes) -- nothing to format
      }
      const all_numeric = col_values.every(is_valid_number_string);
      if (!all_numeric) {
        continue; // mixed/text column -- leave as-is
      }
      raw_matrix.forEach(row => {
        row[c] = format_number_string(row[c]);
      });
    }
    return raw_matrix;
  };

  let raw_clipboard;
  try {
    raw_clipboard = await navigator.clipboard.readText();
  } catch (err) {
    return null; // Return null instead of undefined for explicit checking
  }
  const data = parse_tsv_data(raw_clipboard);
  if (!(Array.isArray(data) && data.length > 0 && Array.isArray(data[0]))) {
    return null; // Return null if parsing fails
  }
  return {
    data: data,
    dims: {
      row: data.length,
      col: data[0].length
    }
  };
}
/****************************MAIN INTERATION FUNCTIONS**************************************/

async function move_tab(increment) {
  const active_id = document.activeElement.id;
  if (!active_id) {
    alert(`No input box element is selected.`);
    return;
  }
  const current = await get_active_tab();
  let idx = current.idx + increment;
  if ((idx + 1) > current.len) {
    idx = current.len - 1;
  }
  if (idx < 0) {
    idx = 0;
  }
  await select_tab_by_index(idx);
  const selector = build_element_selector(active_id);
  const new_tab_element = await wait_for_element(selector);
  if (new_tab_element) {
    new_tab_element.focus();
    new_tab_element.click();
    // .select() only exists on text inputs/textareas, not <select> elements
    if (typeof new_tab_element.select === 'function') {
      new_tab_element.select();
    }
  }
}

async function set_tab_value(idx, value, input_element_id) {
  if (!input_element_id) throw new Error(`No input element selected to target with data entry.`);
  await select_tab_by_index(idx);
  const selector = build_element_selector(input_element_id);
  const new_tab_element = await wait_for_element(selector);
  if (new_tab_element) {
    new_tab_element.focus();
    new_tab_element.click();
    await set_input_value(value, new_tab_element);
  }
}

async function get_tab_value(idx, input_element_id) {
  if (!input_element_id) throw new Error(`No input element selected to target with data entry.`);
  await select_tab_by_index(idx);
  const selector = build_element_selector(input_element_id);
  const new_tab_element = await wait_for_element(selector);
  if (!new_tab_element) return undefined;
  if (new_tab_element.tagName === 'SELECT') {
    const options = new_tab_element.options;
    const text = (options.length > 0 && new_tab_element.selectedIndex >= 0)
      ? options[new_tab_element.selectedIndex].text.trim()
      : '';
    // Placeholder option (e.g. "Select") reads back as blank, same as Clerk's export_to_clipboard
    return text.toLowerCase() === 'select' ? '' : text;
  }
  return new_tab_element.value;
}

async function paste_to_tabs(ignore_zeros) {
  // Uses the relaxed lookup since closing a flyout can leave activeElement pointed
  // at a focus-guard element with no id right after a dropdown pick.
  const active_id = get_active_input_id();
  if (!active_id) {
    alert(`No input box element is selected.`);
    return;
  }
  const tsv = await read_clipboard();
  if (!tsv) {
    alert(`Could not read or parse clipboard data.`);
    return;
  }
  if (tsv.dims.col > 1) {
    alert(`Paste to tabs only allows ranges of 1 column.`);
    return;
  }
  const tabs = await get_active_tab();
  const limit = Math.min(tsv.dims.row, tabs.len);
  for (let i = 0; i < limit; i++) {
    const data = tsv.data[i][0];
    const isZeroOrEmpty = data === "" || parseFloat(data) === 0;
    if (ignore_zeros && isZeroOrEmpty) {
      continue;
    }
    try {
      await set_tab_value(i, data, active_id);
    } catch (err) {
    }
  }
}

async function sum_all_tabs() {
  const active_id = document.activeElement.id;
  if (!active_id) {
    alert(`No input box element is selected.`);
    return;
  }
  let rolling_sum = 0;
  const tabs = await get_active_tab();
  for (let i = 0; i < tabs.len; i++) {
    const val = await get_tab_value(i, active_id);
    const num = parseFloat(val.replace(/,/g, ''));
    if (!isNaN(num)) {
      rolling_sum += num;
    }
  }
  alert(`Total Sum across all tabs: ${rolling_sum.toLocaleString()}`);
}

async function clear_all_tabs() {
  const active_id = document.activeElement.id;
  if (!active_id) {
    alert(`No input box element is selected.`);
    return;
  }
  const tabs = await get_active_tab();
  for (let i = 0; i < tabs.len; i++) {
    await set_tab_value(i, "", active_id);
  }
}

async function dump_all_tab_values() {
  const active_id = document.activeElement.id;
  if (!active_id) {
    alert(`No input box element is selected.`);
    return;
  }
  const tabs = await get_active_tab();
  const values = [];
  // NOTE: this leaves the tab selector on the last tab visited (same trade-off as sum_all_tabs).
  for (let i = 0; i < tabs.len; i++) {
    try {
      const val = await get_tab_value(i, active_id);
      values.push(val ?? '');
    } catch (err) {
      values.push('');
    }
  }
  const tsv_string = values.join('\n');
  try {
    await navigator.clipboard.writeText(tsv_string);
    alert('Tab values successfully copied to clipboard.');
  } catch (err) {
    alert('Failed to copy to clipboard. Ensure the page has focus.');
  }
}

async function dump_full_list_data() {
  try {
    const names = await get_all_tab_names();
    if (!names || names.length === 0) return;
    const tsv_string = names.join('\n');
    await navigator.clipboard.writeText(tsv_string);
    alert('Tab list successfully copied to clipboard.');
  } catch (err) {
    alert('Failed to copy to clipboard. Ensure the page has focus.');
  }
}