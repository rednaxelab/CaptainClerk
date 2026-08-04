# CaptainClerk

A Chrome extension that automates repetitive data entry in **Intuit ProConnect Tax Online** — paste spreadsheet data straight into ProConnect's grids and forms (including dropdowns, selects, and autocomplete fields), copy it back out for reconciliation, and navigate the tax return viewer without fighting continuous-scroll rendering.

Everything is driven by keyboard shortcuts. Click the extension icon at any time for a full reference of every shortcut currently active.

---

## What it does

CaptainClerk is three features under one roof:

### Clerk
Paste and copy for ProConnect's **grid tables** (e.g. depreciation schedules, Quick Entry grids). Handles plain text fields, native `<select>` dropdowns, and ProConnect's custom autocomplete/flyout fields (like the MACRS method picker) — matching on the leading code (`"53 = MACRS 5-year..."` → just type `53`). Read-only/auto-derived fields are skipped automatically rather than corrupting adjacent cells.

### Clerk Tabs
For UI where the *same field* is repeated across a set of ProConnect's "tabs" (e.g. entering one value per client/entity). Paste a column of spreadsheet data straight down the tabs, sum them, clear them, or copy them back out for comparison — starting from either the first tab or whichever tab you're currently on.

### Captain
Tax-return-viewer features. Currently: hide the sidebar and switch ProConnect's continuous-scroll form rendering into a single-page-at-a-time view (with next/previous navigation), reclaiming screen space and letting you flip through a return the way Lacerte used to, rather than scrolling through every page stacked end to end.

---

## Installation

CaptainClerk isn't published to the Chrome Web Store — it's loaded as an unpacked local extension.

1. Open Chrome and go to `chrome://extensions`.
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked**.
4. Select this project's root folder (the one containing `manifest.json`).
5. Confirm **CaptainClerk** appears in your extensions list and is enabled.

**After any update to the code**, click the reload icon on the CaptainClerk card in `chrome://extensions` — refreshing the ProConnect tab alone is not enough, since Chrome only re-reads the extension's files on an explicit reload.

---

## Usage

**Grid paste/copy (Clerk):**
1. Copy a range from Excel/Google Sheets (TSV).
2. Click into the first cell in ProConnect where you want the paste to start.
3. Press `Cmd/Ctrl+Shift+V`.

**Tab paste/copy (Clerk Tabs):**
1. Copy a single column of values.
2. Click into the field on whichever tab you want to start from.
3. Press `Alt+Shift+V` (starts from tab #1) or `Alt+Shift+.` (starts from the tab you're currently on).

**Tax return viewer (Captain):**
On the split-view tax return page, press `Cmd/Ctrl+Shift+L` to hide the sidebar and switch to single-page mode; `PageDown`/`PageUp` to flip pages; press `Cmd/Ctrl+Shift+L` again to go back to normal.

For the complete, current list of every shortcut, **click the CaptainClerk icon in the Chrome toolbar** — it opens a reference popup generated from the actual shortcuts in the code.

---

## How it's organized

```
manifest.json           Extension config; also defines script load order
popup.html               Keybindings reference (opens from the toolbar icon)
src/registry.js          Shared hotkey registry (used by captain.js)
src/captain.js           Tax-return-viewer features
src/clerk.js              Grid table paste/copy/clear
src/clerk_tabs.js         Cross-tab paste/copy/sum/clear
```

`clerk.js` and `clerk_tabs.js` currently manage their own keyboard listeners rather than going through `registry.js`; only `captain.js` uses the shared registry today. Migrating the other two is a planned follow-up, not yet done.

---

## Known limitations

- Dropdown/autocomplete matching works by scanning the visible option text for your typed value — if ProConnect changes how a specific field renders, that field's matching may need updating.
- Single-page mode in the tax return viewer depends on ProConnect's current DOM structure for that page. If ProConnect changes that page's layout, single-page mode may need to be re-pointed at the new structure (paste/copy in Clerk and Clerk Tabs are unaffected either way).
- This is a personal tool built against one specific ProConnect environment, not tested across accounts/configurations.

---

## License

All rights reserved. See [`LICENSE`](./LICENSE).
