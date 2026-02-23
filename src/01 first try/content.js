
const tsv_data = `
 50,000.000 	 PROSHARES TR II ULTA BLMBG 2017 ETF 	 -1/1/24 	 01/04/24 	 1,300,568 	 1,529,026 
 15,000.000 	 PROSHARES TR II ULTA BLMBG 2017 ETF 	 -1/1/24 	 01/08/24 	 384,746 	 453,343 
 1,500.000 	 DOORDASH INC CL A COMMON STOCK 	 01/10/24 	 01/10/24 	 158,073 	 158,500 
 2,000.000 	 VALARIS LIMITED COMMON SHARES COMMON STOCK 	 08/08/23 	 01/10/24 	 127,259 	 140,004 
 15,000.000 	 TRANSOCEAN LTD REG SHS COMMON STOCK 	 -1/1/24 	 01/10/24 	 85,151 	 88,725 
 10,000.000 	 MARATHON DIGITAL HOLDINGS INC COM COMMON STOCK 	 01/11/24 	 01/11/24 	 243,884 	 252,618 `;

function parse_tsv_data(raw_data) {
  return raw_data.split(/\r?\n/).map(row => row.replace(/\u00A0/g, ' ').trim()).filter(row => row.length > 0).map(row => row.split('\t').map(cell => cell.trim()));
}

function get_grid_inputs() {
  const inputs = Array.from(document.querySelectorAll('input[data-testid^="QuickEntry-cell"]'));
  console.log(inputs.length);
  const active = document.activeElement;
  console.log(active);
  const startIndex = inputs.indexOf(active);
  console.log(startIndex);
}

async function humanType(element, text) {
    element.focus();
    for (const char of text) {
        const keyEvent = new KeyboardEvent('keydown', { key: char, bubbles: true });
        element.dispatchEvent(keyEvent);
        if (!keyEvent.defaultPrevented) {
            document.execCommand('insertText', false, char);
        }
        await new Promise(r => setTimeout(r, 20));
        const keyUp = new KeyboardEvent('keyup', { key: char, bubbles: true });
        element.dispatchEvent(keyUp);
    }
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
}

function pressTab(element) {
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

document.addEventListener('paste', (e) => {
  // const table = parse_tsv_data(tsv_data);
  // get_grid_inputs();
  const el = document.activeElement;
  const input = 'Brent';
  humanType(el, 'Test1');
  // for(let idx in input) {
  //   humanType(el, input[idx]);
  // }
  pressTab(el);
});
