/*********************************************************************************************************************************************************
    DUMMY DATA AND TEMPORARY HOTKEY REGISTRATION
 *********************************************************************************************************************************************************/
const TSV_RAW = `
 50,000.000 	 PROSHARES TR II ULTA BLMBG 2017 ETF 	 -1/1/24 	 01/04/24 	 1,300,568 	 1,529,026 
 15,000.000 	 PROSHARES TR II ULTA BLMBG 2017 ETF 	 -1/1/24 	 01/08/24 	 384,746 	 453,343 
 1,500.000 	 DOORDASH INC CL A COMMON STOCK 	 01/10/24 	 01/10/24 	 158,073 	 158,500 
 2,000.000 	 VALARIS LIMITED COMMON SHARES COMMON STOCK 	 08/08/23 	 01/10/24 	 127,259 	 140,004 
 15,000.000 	 TRANSOCEAN LTD REG SHS COMMON STOCK 	 -1/1/24 	 01/10/24 	 85,151 	 88,725 
 10,000.000 	 MARATHON DIGITAL HOLDINGS INC COM COMMON STOCK 	 01/11/24 	 01/11/24 	 243,884 	 252,618 `;

document.addEventListener('keyup', (e) => {
  if (e.key === 'F9') {
    go();
  }
});

/*********************************************************************************************************************************************************
    IMPLEMENTATION DETAILS BELOW...
 *********************************************************************************************************************************************************/

class Robot {
  // We need to able to target rows and input cells from multiple screens. Note on the 'input[data-testid^="expDetView-"][data-testid*="-input-idx-"]'
  // you cannot write something like 'input[data-testid^="expDetView-*-input-idx-"]' to accept any text between "expDetView-" and "-input-idx-". Instead,
  // you have to chain them together: 'input[data-testid^="expDetView-"][data-testid*="-input-idx-"]' or filter a less strict result with regex.
  #row_test_ids = [['tr[data-testid*="QuickEntry-row-idx-"]', 'input[data-testid*="QuickEntry-cell"]'],
  ['tr[data-testid*="expDetViewexpColumns-idx-"]', 'input[data-testid^="expDetView-"][data-testid*="-input-idx-"]']];

  #tsv_data = null;
  #cell_matrix = null;
  #start_idx = null;

  constructor() {
    const active = document.activeElement;
    this.set_or_reset_cell_matrix();
    let active_element_idx = this.find_element_in_grid(active);
    if (active_element_idx) {
      this.#start_idx = active_element_idx;
    }
    this.read_clipboard();
  }

  find_element_in_grid(element) {
    for (let row_number in this.#cell_matrix) {
      let col_number = this.#cell_matrix[row_number].indexOf(element);
      if (col_number !== -1) {
        return {
          start_row: parseInt(row_number),
          start_col: col_number
        }
      }
    }
  }

  set_or_reset_cell_matrix() {
    let cellMatrix = undefined;
    let cellMatrixFound = false;
    for (let idx in this.#row_test_ids) {
      const rows = document.querySelectorAll(this.#row_test_ids[idx][0]);
      cellMatrix = Array.from(rows).map(row => {
        const inputs = row.querySelectorAll(this.#row_test_ids[idx][1]);
        return Array.from(inputs);
      });
      if (cellMatrix[0].length > 0 && Array.isArray(cellMatrix[0])) {
        cellMatrixFound = true;
        break;
      }
    }
    if (!cellMatrixFound) return;
    this.#cell_matrix = cellMatrix;
  }

  examine_grid() {
    console.log(`Initial grid dimensions: rows=${this.#cell_matrix.length}, columns=${this.#cell_matrix[0].length}\nStarting row,col index: ${this.#start_idx}`);
  }

  press_tab(element = document.activeElement) {
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      keyCode: 9,
      which: 9,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(tabEvent);
    const allFocusable = Array.from(document.querySelectorAll('input[data-focusable="true"]'));
    const currentIndex = allFocusable.indexOf(element);
    const nextElement = allFocusable[currentIndex + 1];
    if (nextElement) {
      nextElement.focus();
    }
  }

  async set_input_value(value, element = document.activeElement) {
    await dbugger_set_input_value(value, element);
  }

  async read_clipboard() {
    this.#tsv_data = this.parse_tsv_data(TSV_RAW);
    // try {
    //   const raw_clipboard = await navigator.clipboard.readText();
    //   this.#tsv_data = this.parse_tsv_data(raw_clipboard);
    // } catch (err) {
    //   alert('Failed to read clipboard contents: ', err);
    // }
  }

  parse_tsv_data(raw_data) {
    return raw_data.split(/\r?\n/)
      .map(row => row
        .replace(/\u00A0/g, ' ')
        .trim())
      .filter(row => row.length > 0)
      .map(row => row.split('\t')
        .map(cell => cell.trim()));
  }

  async enter_clipboard_data() {
    let p = {
      tsv_data: this.#tsv_data,
      cell_matrix: this.#cell_matrix,
      start_idx: this.#start_idx,
      this: this
    };
    await dbugger_enter_clipboard_data(p);
  }
}

// NOTE function is anonymous to easily tweak and change up logic and iterate.
const go = async () => {
  let r = new Robot();
  await r.enter_clipboard_data();
}

// *********************CURRENT AREA FOR WORKING IMPLEMENTATION.*********************

observer.observe(tableTarget, { childList: true, subtree: true });

async function dbugger_enter_clipboard_data(p) {
  try {
    let clipboard_rows = p.tsv_data.length;
    let clipboard_cols = p.tsv_data[0].length;
    let cell_matrix_cols = p.cell_matrix[0].length;
    const { start_row, start_col } = p.start_idx;
    if (clipboard_cols > cell_matrix_cols) {
      throw new Error(`Clipboard data includes more columns (${clipboard_cols}) than input matrix allows for (${cell_matrix_cols}).`);
    }
    // IMPLEMENTATON: Need to remove 2 limit. Also, need to refresh cell_matrix
    // when new row is added.
    // for (let i = start_row; i < clipboard_rows; i++) {
    for (let i = start_row; i < 2; i++) {
      // select new row active element
      let el = p.cell_matrix[i][start_col];
      el.focus();
      for (let j = start_col; j < clipboard_cols; ++j) {
        el = p.cell_matrix[i][j];
        await p.this.set_input_value(p.tsv_data[i][j], el);
      }
      p.this.press_tab();
      await new Promise(r => setTimeout(r, 20));
    }
  }
  catch (e) {
    alert(`Error occured in method 'enter_clipboard_data': ${e}`);
  }
}

async function dbugger_set_input_value(text, element) {
  element.focus();
  document.execCommand('insertText', false, text);
  // Necessary events to commit
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  // Give React 30ms to "see" the final value before we kill focus
  await new Promise(r => setTimeout(r, 5));
  element.blur();
}