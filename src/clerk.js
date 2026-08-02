const url_params = new URLSearchParams(window.location.search);
const tax_return_window = url_params.get('splitViewEnabled') === 'true';
let tax_return_side_bar_hidden = false;


if (tax_return_window) { // splitViewEnabled=true in url indicates you're on tax return viewer
  document.addEventListener('keydown', (e) => {
    // Ctrl + Shift + L (Hides sidebar on tax return tab)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyL') {
      const sidebar = document.querySelector('div.sidebar');
      if (sidebar) {
        if (tax_return_side_bar_hidden) {
          sidebar.hidden = false;
          tax_return_side_bar_hidden = false;
        } else {
          sidebar.hidden = true;
          tax_return_side_bar_hidden = true;
        }
      }
    }
  }, true);
} else { // these is normal proconnect extension functionality
  document.addEventListener('keydown', async (e) => {
    // Allow for MacOS CMD (metaKey) key OR control key
    const cmdOrCtrl = e.ctrlKey || e.metaKey;
    // Ctrl + Shift + V (Paste Data)
    if (cmdOrCtrl && e.shiftKey && e.code === 'KeyV') {
      e.preventDefault();
      enter_data();
    }
    // Ctrl/Cmd + Shift + C (Copy Data)
    if (cmdOrCtrl && e.shiftKey && e.code === 'KeyC') {
      e.preventDefault();
      copy_data();
    }
    // Alt + Shift + 0 (clear out grid of inputs)
    else if (e.altKey && e.shiftKey && e.code === 'End') {
      e.preventDefault();
      clear_data();
    }
    // Alt + Shift + Delete (Delete Until Empty)
    else if (e.altKey && e.shiftKey && e.code === 'Delete') {
      e.preventDefault();
      e.stopImmediatePropagation();
      delete_until_empty();
    }
    // Alt + Delete (Delete Active Row)
    else if (e.altKey && e.code === 'Delete') {
      e.preventDefault();
      e.stopImmediatePropagation();
      delete_active_row();
    }
  }, true);
}

async function enter_data() {
  const clerk = new Clerk();
  try {
    await clerk.init({ read_clipboard: true });
    await clerk.enter_clipboard_data();
  } catch (err) {
    console.error("Clerk enter data aborted:", err.message);
  }
}

async function copy_data() {
  const clerk = new Clerk();
  try {
    await clerk.init({ read_clipboard: false });
    await clerk.export_to_clipboard();
  } catch (err) {
    console.error("Clerk export aborted:", err.message);
  }
}

async function clear_data() {
  const clerk = new Clerk();
  try {
    await clerk.init({ read_clipboard: false });
    await clerk.clear_all_inputs();
  } catch (err) {
    console.error("Clerk clear aborted:", err.message);
  }
}

/*********************************************************************************************************************************************************
    MAIN IMPLEMENTATION OF CLERK CLASS
 *********************************************************************************************************************************************************/

class Clerk {

  #tsv_data = undefined;
  #tsv_dims = { row: undefined, col: undefined }; //we waant to track the dimensions of the inputs that we're looking to enter
  #root = undefined; // tbody root. main element containing rows and inputs.
  #inputs = undefined; // 2d array of text and number inputs
  #start_pos = undefined; // this is index { row: x, col: y } format start position -- set in the constructor
  #new_row_detected = false; // simple glag for our observe (dirty === true if changes so we can update inputs)

  async init(options) { // constructors cannot be async, using this instead.
    try {
      // We start everything by selecting an input element. this will not only allow us to find parent table and rows but it
      // will also give us context regarding the initial start position relative to the table.
      const el = document.activeElement;
      if (!el || el.tagName !== 'INPUT') {
        alert('No active element selected. Please select an input in a table.');
        return;
      }
      this.#root = el.closest('tbody');
      // if there is no root found, terminate constructor and inform user.
      if (!this.#root) {
        throw new Error(`Can not define the root of input area. Input needs parent <tbody>.`);
      }
      this.#refresh_inputs();
      this.#inputs.forEach((row_inputs, r_idx) => {
        const c_idx = row_inputs.indexOf(el);
        if (c_idx !== -1) {
          this.#start_pos = { row: r_idx, col: c_idx };
        }
      });

      if (!this.#start_pos) {
        const typeFound = el.type;
        throw new Error(`Active element found but not mapped. Type detected: ${typeFound}`);
      }
      if (options.read_clipboard)
        await this.read_clipboard();
    }
    catch (e) {
      throw new Error(`Error in Clerk constructor: ${e}`);
    }
  } // end constructor

  #refresh_inputs() {
    const rows = this.#root.querySelectorAll('tr');
    this.#inputs = Array.from(rows).map(row => {
      const allElements = Array.from(row.querySelectorAll('input, select'));
      // Capture SELECT tags and TEXT inputs
      return allElements.filter(el =>
        el.tagName === 'SELECT' || (el.tagName === 'INPUT' && (!el.type || el.type === 'text'))
      );
    });
  }

  async set_input_value(text, element) {
    element.focus();
    if (element.tagName === 'SELECT') {
      const options = Array.from(element.options);
      const searchStr = text.trim().toLowerCase();
      // Match by exact value (e.g., "1"), exact text (e.g., "1 = Schedule A"), or prefix
      const targetOption = options.find(opt =>
        opt.value.toLowerCase() === searchStr ||
        opt.text.trim().toLowerCase() === searchStr ||
        opt.text.trim().toLowerCase().startsWith(`${searchStr} =`) ||
        opt.text.trim().toLowerCase().startsWith(`${searchStr}=`)
      );
      if (targetOption) {
        element.value = targetOption.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else {
      let valToInsert = text;
      // If passing a combined string (e.g., "91 = Straight Line") into a numeric input, extract just the number
      if (valToInsert.includes('=') && element.classList.toString().toLowerCase().includes('numeric')) {
        valToInsert = valToInsert.split('=')[0].trim();
      }
      element.setSelectionRange(0, element.value.length);
      document.execCommand('insertText', false, valToInsert);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await new Promise(r => setTimeout(r, 5));
    element.blur();
  }

  async read_clipboard() {
    const is_valid_number_string = (val) => {
      if (val === '' || val === '-' || val === '–') return true;
      return /^[\$\-\(]?\s*[\d,]+(\.\d+)?\s*\)?$/.test(val);
    };
    const format_number_string = (val) => {
      if (val === '' || val === '-' || val === '–') return '';
      const is_negative = val.includes('(') || val.includes('-');
      const num_only = val.replace(/[^\d.]/g, '');
      const parsed_float = parseFloat(num_only);
      const rounded = Math.round(parsed_float);
      return is_negative && rounded !== 0 ? `-${rounded}` : `${rounded}`;
    };
    try {
      const raw_clipboard = await navigator.clipboard.readText();
      const raw_matrix = raw_clipboard.split(/\r?\n/)
        .map(row => row.replace(/\u00A0/g, ' '))
        .filter(row => row.trim().length > 0)
        .map(row => row.split('\t').map(cell => {
          let val = cell.trim();
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1).trim();
          }
          return val;
        }));
      if (!Array.isArray(raw_matrix) || raw_matrix.length === 0 || !Array.isArray(raw_matrix[0])) {
        throw new Error('TSV Data not parseable into matrix/grid for entry.');
      }
      const col_count = raw_matrix[0].length;
      const numeric_cols = new Set();
      for (let c = 0; c < col_count; c++) {
        let all_numeric = true;
        for (let r = 0; r < raw_matrix.length; r++) {
          if (!is_valid_number_string(raw_matrix[r][c])) {
            all_numeric = false;
            break;
          }
        }
        if (all_numeric) {
          numeric_cols.add(c);
        }
      }
      this.#tsv_data = raw_matrix.map(row =>
        row.map((cell, c_idx) => {
          if (numeric_cols.has(c_idx)) {
            return format_number_string(cell);
          }
          return cell;
        })
      );
      this.#tsv_dims.row = this.#tsv_data.length;
      this.#tsv_dims.col = this.#tsv_data[0].length;
    } catch (err) {
      alert('Failed to read clipboard contents: ' + err);
    }
  }

  async #wait_for_sync(timeout = 3000) {
    const start = Date.now();
    while (!this.#new_row_detected) {
      if (Date.now() - start > timeout) throw new Error("Timeout waiting for row.");
      await new Promise(r => setTimeout(r, 50));
    }
    this.#new_row_detected = false;
    this.#refresh_inputs();
  }

  #start_new_row_observer() {
    const observer = new MutationObserver((muts) => {
      const row_was_added = muts.some(m =>
        Array.from(m.addedNodes).some(node => node.tagName === 'TR')
      );
      if (row_was_added) {
        this.#new_row_detected = true;
      }
    });
    observer.observe(this.#root, { childList: true });
    return observer;
  }

  async enter_clipboard_data() {
    const observer = this.#start_new_row_observer();
    try {
      const { row: tsv_rows, col: tsv_cols } = this.#tsv_dims;
      const { row: start_row, col: start_col } = this.#start_pos;
      for (let i = 0; i < tsv_rows; i++) {
        const current_idx = start_row + i;
        if (current_idx >= this.#inputs.length) {
          await this.#wait_for_sync();
        }
        const row = this.#inputs[current_idx];
        if (!row) throw new Error(`Row ${current_idx} not found after sync.`);
        for (let col_idx = 0; col_idx < tsv_cols; col_idx++) {
          const el = row[start_col + col_idx];
          if (el) {
            await this.set_input_value(this.#tsv_data[i][col_idx], el);
          }
        }
        await new Promise(r => setTimeout(r, 50));
      }
      await this.#auto_trim_entries();
    } catch (e) {
      alert(`Error occured in method 'enter_clipboard_data': ${e}`);
    } finally {
      observer.disconnect();
    }
  }

  async #auto_trim_entries() {
    this.#refresh_inputs();
    const invalidInputs = Array.from(this.#root.querySelectorAll('input[aria-invalid="true"]'));
    for (const el of invalidInputs) {
      const descId = el.getAttribute('aria-describedby');
      if (!descId) continue;
      const container = document.getElementById(descId);
      if (!container) continue;
      // Matches the Validation-message class regardless of the hash suffix
      const messageEl = container.querySelector('[class*="Validation-message-"]');
      if (!messageEl) continue;
      const match = messageEl.textContent.match(/(\d+)/);
      if (match) {
        const limit = parseInt(match[1], 10);
        if (el.value.length > limit) {
          const truncatedValue = el.value.substring(0, limit).trim();
          // This call will now replace the text, not append it
          await this.set_input_value(truncatedValue, el);
        }
      }
    }
  }

  async clear_input(element) {
    element.focus();
    if (element.tagName === 'SELECT') {
      element.selectedIndex = 0;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      element.setSelectionRange(0, element.value.length);
      document.execCommand('insertText', false, '');
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await new Promise(r => setTimeout(r, 5));
    element.blur();
  }

  async clear_all_inputs() {
    this.#refresh_inputs();
    // Flatten the 2D array of inputs to iterate through all of them
    const allElements = this.#inputs.flat();
    for (const el of allElements) {
      if (el && !el.readOnly && !el.disabled) {
        await this.clear_input(el);
      }
    }
  }

  async export_to_clipboard() {
    // Filter out rows where every input is empty and every select is on "Select"
    const active_rows = this.#inputs.filter(row => {
      return row.some(el => {
        if (el.tagName === 'SELECT') {
          const text = el.options.length > 0 && el.selectedIndex >= 0
            ? el.options[el.selectedIndex].text.trim().toLowerCase()
            : '';
          return text !== '' && text !== 'select';
        }
        return el.value.trim() !== '';
      });
    });
    const tsvString = active_rows
      .map(row => row.map(el => {
        if (el.tagName === 'SELECT') {
          const text = el.options.length > 0 && el.selectedIndex >= 0
            ? el.options[el.selectedIndex].text
            : '';
          return text.trim().toLowerCase() === 'select' ? '' : text;
        }
        return el.value;
      }).join('\t'))
      .join('\n');
    try {
      await navigator.clipboard.writeText(tsvString);
    } catch (err) {
      alert('Failed to copy to clipboard: ' + err);
    }
  }
} // end class definition


/*********************FUNCTIONS FOR DELETING SHIT****************************/
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function delete_until_empty() {
  const el = document.activeElement;
  if (!el || el.tagName !== 'INPUT') {
    alert('No active element selected. Please select an input in a table.');
    return;
  }
  const tbody = el.closest('tbody');
  while (true) {
    const buttons = tbody.querySelectorAll('button[aria-label="Delete"]');
    const count = buttons.length;
    if (count === 0) break;
    const firstButton = buttons[0];
    firstButton.click();
    await wait(20);
    const confirmBtn = Array.from(document.querySelectorAll('button'))
      .find(btn =>
        btn.textContent.trim().toLowerCase() === 'delete' &&
        btn.offsetParent !== null
      );
    if (confirmBtn) {
      confirmBtn.click();
      await wait(20);
    }
    // After the logic runs for the 1st (last) item, exit.
    if (count === 1) break;
  }
}

async function delete_active_row() {
  const el = document.activeElement;
  if (!el) return;
  const row = el.closest('tr');
  if (!row) {
    alert('Active element is not inside a table row.');
    return;
  }
  const deleteBtn = row.querySelector('button[aria-label="Delete"]');
  if (deleteBtn) {
    deleteBtn.click();
    await wait(20);
    const confirmBtn = Array.from(document.querySelectorAll('button'))
      .find(btn =>
        btn.textContent.trim().toLowerCase() === 'delete' &&
        btn.offsetParent !== null
      );
    if (confirmBtn) {
      confirmBtn.click();
    }
  }
}