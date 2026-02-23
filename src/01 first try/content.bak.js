document.addEventListener('paste', (e) => {
    console.log(`BBA:Event listener added.`);
    const active = document.activeElement;
    if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) return;

    const tsvData = e.clipboardData.getData('text/plain');
    if (!tsvData) return;

    const rawRows = tsvData.split(/\r?\n/).filter(row => row.length > 0).map(row => row.split('\t'));
    if (rawRows.length === 0) return;

    const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled && !el.readOnly;
    });

    const startIndex = allInputs.indexOf(active);
    if (startIndex === -1) return;

    e.preventDefault();

    const rows = [];
    let currentRow = [];
    let lastTop = -1;

    allInputs.forEach(input => {
        console.log(`Input loop started.`);
        const rect = input.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        if (lastTop === -1 || Math.abs(top - lastTop) > 10) {
            if (currentRow.length > 0) rows.push(currentRow);
            currentRow = [];
            lastTop = top;
        }
        currentRow.push(input);
    });
    if (currentRow.length > 0) rows.push(currentRow);

    let startRowIdx = -1;
    let startColIdx = -1;

    for (let r = 0; r < rows.length; r++) {
        const c = rows[r].indexOf(active);
        if (c !== -1) {
            startRowIdx = r;
            startColIdx = c;
            break;
        }
    }

    if (startRowIdx === -1) return;

    rawRows.forEach((rowData, rOffset) => {
        const targetRowIdx = startRowIdx + rOffset;
        if (targetRowIdx >= rows.length) return;

        const targetRow = rows[targetRowIdx];
        rowData.forEach((val, cOffset) => {
            const targetColIdx = startColIdx + cOffset;
            if (targetColIdx >= targetRow.length) return;

            const targetInput = targetRow[targetColIdx];
            let cleaned = val.trim();
            if (cleaned === '-' || cleaned === '–' || cleaned === '—') {
                cleaned = '0';
            }

            targetInput.value = cleaned;
            ['input', 'change', 'blur'].forEach(type => {
                targetInput.dispatchEvent(new Event(type, { bubbles: true }));
            });
        });
    });
});
