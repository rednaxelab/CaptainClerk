const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function deleteUntilEmpty() {
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

async function deleteActiveRow() {
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

// deleteUntilEmpty();