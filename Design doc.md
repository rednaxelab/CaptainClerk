# Captain Clerk Design Doc

## Explanation of design split and name

***Clerk*** class: Is basically some simple functionality with JS and DOM to make my life easier.

## Currently Implemented Hotkeys for *Clerk*

| HOTKEY | DESCRIPTION |
| :----: | :---------: |
|`CTRL+SHIFT+L`|On tax return page, hide sidebar.|
|`CTRL/CMD+SHIFT+V`|Legacy paste -- ignores dropdowns, always plain text.|
|`CTRL/CMD+ALT+SHIFT+V`|Paste -- honors dropdowns (select, autocomplete).|
|`CTRL/CMD+SHIFT+C` | Legacy copy -- ignores dropdowns, raw values only.|
|`CTRL/CMD+ALT+SHIFT+C` | Copy -- honors dropdowns (select text, autocomplete display text).|
|`ALT+SHIFT+END`|Clears all data in sensed grid of inputs|
|`ALT+SHIFT+DEL`|Delete all row data until it's gone|
|`ALT+DEL`|Delete current row|

## Currently Implemented Hotkeys for *Clerk Tabs*
| HOTKEY        | DESCRIPTION |
| :-----------: | :------: |
| `CTRL+SHIFT+DOWN and UP` |Move tabs left and right|
| `ALT+SHIFT+V`|Paste to tabs, ignore zeros (dropdown-aware).|
| `CTRL+ALT+SHIFT+V`|Paste to tabs, enforce zeros entry (dropdown-aware).|
| `ALT+SHIFT+S` |Sum all boxes by tab.|
| `ALT+SHIFT+0` |Clear all boxes by tab.|
| `ALT+SHIFT+L` |Copy all "View All" list data to clipboard in TSV Format.|
| `ALT+SHIFT+C` |Copy all tab values (for active input) to clipboard, one per line -- backward, for reconciliation.|

## Things to implement

- [x] Get all K-1 input data (***Clerk Tabs***) and copy it into clipboard (basically going backward for comparison). Implemented as `alt+shift+c` (Clerk's own copy is `ctrl/cmd+shift+c`, so no collision).
- [ ] Add interaction with checkboxes?
- [x] Add ClerkTabs integration with dropdown boxes we just did. Native `<select>` handling ported from Clerk into `clerk_tabs.js` (`set_input_value`, `get_tab_value`, `move_tab` now all handle `<select>` alongside `<input>`).
- [x] Custom autocomplete/combobox `<input>` dropdown support (e.g. depreciation method picker) in ClerkTabs. Turned out to be a **text `<input>` paired with a portal-rendered flyout `<ul>`** (keyed by `data-flyout-trigger`/`data-flyout-area`), not a plain `<div>`-based combobox as originally assumed -- typing the leading code filters the list, then the matching item is clicked directly (Enter alone jumps focus to the next field and doesn't reliably commit). See `set_autocomplete_value` in `clerk_tabs.js`.
- [x] Same autocomplete/flyout support for the Clerk class (`clerk.js`) grid inputs -- ported (`#set_autocomplete_value`, `#click_menu_item`). NOTE: `clear_input`'s blank-out path for this widget type is untested; if `clear_all_inputs` doesn't stick on these fields, start there.
- [ ] UI maybe from extension shortcut in toolbar that shows all current hotkeys.

### <u>Other wish list items</u>

- [ ] Tax Return Window: Way to quickly navigate tax returns when sidebar is hidden. Like `ctrl+shift+up and down` which will unhide the panel temporarily, select the next or last form. And maybe a fuzzy finder for all forms? But that can wait until later. And quickly scoll pages. It's currently clunky as fuck.
- [ ] Something that will toggle the possible inputs and style them (like red box around). This will be useful to see what boxes can be copied and pasted from, to build a schema for import with right columns, etc.
- [ ] Maybe some UI and UX--currently, everything is set up using hotkeys which are fine, but may be hard for my older partner.
- [ ] For the paste to tabs (***Clerk Tabs***), I need a paste that starts where you're currently to where you can append to data that's already there without changing anything before where you're at.