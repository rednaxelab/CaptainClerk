# Captain Clerk Design Doc

## Explanation of design split and name

***Clerk*** class: Is basically some simple functionality with JS and DOM to make my life easier.

## Currently Implemented Hotkeys for *Clerk*

| HOTKEY | DESCRIPTION |
| :----: | :---------: |
|`CTRL/CMD+SHIFT+L`|On tax return page, hide sidebar.|
|`CTRL/CMD+SHIFT+V`|Paste -- honors dropdowns (select, autocomplete).|
|`CTRL/CMD+SHIFT+C` | Copy -- honors dropdowns (select text, autocomplete display text).|
|`ALT+SHIFT+END`|Clears all data in sensed grid of inputs|
|`ALT+SHIFT+DEL`|Delete all row data until it's gone|
|`ALT+DEL`|Delete current row|

## Currently Implemented Hotkeys for *Clerk Tabs*
| HOTKEY        | DESCRIPTION |
| :-----------: | :------: |
| `CTRL+SHIFT+DOWN and UP` |Move tabs left and right|
| `ALT+SHIFT+V`|Paste to tabs, ignore zeros (dropdown-aware).|
| `ALT+SHIFT+Z`|Paste to tabs, enforce zeros entry (dropdown-aware).|
| `ALT+SHIFT+S` |Sum all boxes by tab.|
| `ALT+SHIFT+0` |Clear all boxes by tab.|
| `ALT+SHIFT+L` |Copy all "View All" list data to clipboard in TSV Format.|
| `ALT+SHIFT+C` |Copy all tab values (for active input) to clipboard, one per line -- backward, for reconciliation.|

## Things to implement

- [ ] Add interaction with checkboxes?
- [ ] UI maybe from extension shortcut in toolbar that shows all current hotkeys.

### <u>Other wish list items</u>

- [ ] Tax Return Window: Way to quickly navigate tax returns when sidebar is hidden. Like `ctrl+shift+up and down` which will unhide the panel temporarily, select the next or last form. And maybe a fuzzy finder for all forms? But that can wait until later. And quickly scoll pages. It's currently clunky as fuck.
- [ ] Something that will toggle the possible inputs and style them (like red box around). This will be useful to see what boxes can be copied and pasted from, to build a schema for import with right columns, etc.
- [ ] Maybe some UI and UX--currently, everything is set up using hotkeys which are fine, but may be hard for my older partner.
- [ ] For the paste to tabs (***Clerk Tabs***), I need a paste that starts where you're currently to where you can append to data that's already there without changing anything before where you're at.