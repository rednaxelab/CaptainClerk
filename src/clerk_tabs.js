/********************************GLOBALS****************************************************/
const GLOBAL_TIMEOUT = 50; // allow for more if missing switches.

/***************************HOTKEY REGISTRATION*********************************************/
document.addEventListener('keydown', async (e) => {
  // Normalize key for comparison
  const key = e.key.toLowerCase();
  // Ctrl + Shift + Down Arrow
  if (e.ctrlKey && e.shiftKey && key === 'arrowdown') {
    e.preventDefault();
    await move_tab(1);
  }
  // Ctrl + Shift + Up Arrow
  if (e.ctrlKey && e.shiftKey && key === 'arrowup') {
    e.preventDefault();
    await move_tab(-1);
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

async function set_input_value(text, element) {
  element.focus();
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

/****************************MAIN INTERATION FUNCTIONS**************************************/

async function move_tab(increment) {
  const active_id = document.activeElement.id;
  const current = await get_active_tab();
  let idx = current.idx + increment;
  if ((idx + 1) > current.len) {
    idx = current.len - 1;
  }
  if (idx < 0) {
    idx = 0;
  }
  await select_tab_by_index(idx);
  const selector = `input[id=${active_id}]`;
  const new_tab_element = await wait_for_element(selector);
  if (new_tab_element) {
    new_tab_element.focus();
    new_tab_element.click();
  }
}

async function set_tab_value(idx, value, input_element_id) {
  if (!input_element_id) throw new Error(`No input element selected to target with data entry.`);
  await select_tab_by_index(idx);
  const selector = `input[id=${input_element_id}]`;
  const new_tab_element = await wait_for_element(selector);
  if (new_tab_element) {
    new_tab_element.focus();
    new_tab_element.click();
    await set_input_value(value, new_tab_element);
  }
}