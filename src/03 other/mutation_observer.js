const TSV_RAW = `
 50,000.000 	 PROSHARES TR II ULTA BLMBG 2017 ETF 	 -1/1/24 	 01/04/24 	 1,300,568 	 1,529,026 
 15,000.000 	 PROSHARES TR II ULTA BLMBG 2017 ETF 	 -1/1/24 	 01/08/24 	 384,746 	 453,343 
 1,500.000 	 DOORDASH INC CL A COMMON STOCK 	 01/10/24 	 01/10/24 	 158,073 	 158,500 
 2,000.000 	 VALARIS LIMITED COMMON SHARES COMMON STOCK 	 08/08/23 	 01/10/24 	 127,259 	 140,004 
 15,000.000 	 TRANSOCEAN LTD REG SHS COMMON STOCK 	 -1/1/24 	 01/10/24 	 85,151 	 88,725 
 10,000.000 	 MARATHON DIGITAL HOLDINGS INC COM COMMON STOCK 	 01/11/24 	 01/11/24 	 243,884 	 252,618 `;

const TSV_DATA = TSV_RAW.split(/\r?\n/)
  .map(row => row
    .replace(/\u00A0/g, ' ')
    .trim())
  .filter(row => row.length > 0)
  .map(row => row.split('\t')
    .map(cell => cell.trim()));

function get_active_elements() {
  const act_el = document.activeElement;
  const p_tbody = act_el.closest('tbody');
  const p_rows = p_tbody.querySelectorAll('tr');
  let grid = new Array();
  p_rows.forEach(r => grid.push(Array.from(r.querySelectorAll('input')).filter(i => i.type === 'text')));
  let start_pos = undefined;
  for (let i = 0; i < grid.length; ++i) {
    const row = grid[i];
    const col_idx = row.indexOf(act_el);
    if (col_idx !== -1) {
      start_pos = {
        start_row: i,
        start_col: col_idx
      };
      break;
    }
  }
  return {
    tbody: p_tbody,
    rows: p_rows,
    grid: grid,
    start_pos: start_pos
  };
}

let { tbody, rows, grid, start_pos } = get_active_elements();
if (!(grid.length) || !(grid[0].length)) {
  throw new Error(`No table dimensions. You likely didn't select an input.`);
}
const dim = {
  rows: grid.length,
  cols: grid[0].length
};
console.log(`Rows: ${dim.rows}, Columns: ${dim.cols}`);

let LIMITER = 0;

async function enter_row_of_data(data_to_input, row_idx, row_inputs, start_pos) {
  if (LIMITER >= 10) return;
  LIMITER++;
  const start_col = start_pos.start_col;
  const row_data = data_to_input[row_idx];
  for (let i = 0; i < row_inputs.length; ++i) {
    const element = row_inputs[i + start_col];
    const text = data_to_input[row_idx][i];
    element.focus();
    document.execCommand('insertText', false, text);
    // Necessary events to commit data to their backend
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    // Give React time to "see" the final value before we kill focus
    await new Promise(r => setTimeout(r, 5));
    element.blur();
  }
}


/* Mutation observer on tbody table (watching for new rows). */
// First we define the callback function -- this normally takes mutations and observer obj as args
const callback = async (muts, observer) => {
  for (const mut of muts) {
    if (mut.type === 'childList') {
      // check added nodes
      for (const row of mut.addedNodes) {
        if (row.nodeType === 1 && row.tagName === 'TR') {
          const inputs = Array.from(row.querySelectorAll('input')).filter(input => input.type === 'text');
          await enter_row_of_data(TSV_DATA, 2, inputs, start_pos);
        }
      }
    }
  }
};

// Instantiate the observer
const obs = new MutationObserver(callback);
// Set up config
const config = { childList: true };
// Start observer
obs.observe(tbody, config);