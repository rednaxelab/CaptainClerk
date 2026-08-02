# Captain Clerk Design Doc

## Explanation of design split and name

***Clerk*** class: Is basically some simple functionality with JS and DOM to make my life easier.

## Currently Implemented Hotkeys for *Clerk*

| HOTKEY | DESCRIPTION |
| :----: | :---------: |
|`CTRL+SHIFT+L`|On tax return page, hide sidebar.|
|`CTRL+SHIFT+V`|Custom paste. Probably coolest part of it.|
|`ALT+SHIFT+C` | Custom copy! Opposite of the paste--grabs all values to paste to spreadsheet.|
|`ALT+SHIFT+END`|Clears all data in sensed grid of inputs|
|`ALT+SHIFT+DEL`|Delete all row data until it's gone|
|`ALT+DEL`|Delete current row|

## Currently Implemented Hotkeys for *Clerk Tabs*
| HOTKEY        | DESCRIPTION |
| :-----------: | :------: |
| `CTRL+SHIFT+DOWN and UP` |Move tabs left and right|
| `ALT+SHIFT+V`|Paste to tabs, ignore zeros.|
| `CTRL+ALT+SHIFT+V`|Paste to tabs, enforce zeros entry.|
| `ALT+SHIFT+S` |Sum all boxes by tab.|
| `ALT+SHIFT+0` |Clear all boxes by tab.|
| `ALT+SHIFT+L` |Copy all "View All" list data to clipboard in TSV Format.|
| `ALT+SHIFT+C` |Copy all tab values (for active input) to clipboard, one per line -- backward, for reconciliation.|

## Things to implement

- [x] Get all K-1 input data (***Clerk Tabs***) and copy it into clipboard (basically going backward for comparison). Implemented as `alt+shift+c` (Clerk's own copy is `ctrl/cmd+shift+c`, so no collision).
- [ ] Add interaction with checkboxes?
- [ ] Add ClerkTabs integration with dropdown boxes we just did.
- [ ] UI maybe from extension shortcut in toolbar that shows all current hotkeys.

### <u>Other wish list items</u>

- [ ] Tax Return Window: Way to quickly navigate tax returns when sidebar is hidden. Like `ctrl+shift+up and down` which will unhide the panel temporarily, select the next or last form. And maybe a fuzzy finder for all forms? But that can wait until later. And quickly scoll pages. It's currently clunky as fuck.
- [ ] Something that will toggle the possible inputs and style them (like red box around). This will be useful to see what boxes can be copied and pasted from, to build a schema for import with right columns, etc.
- [ ] Maybe some UI and UX--currently, everything is set up using hotkeys which are fine, but may be hard for my older partner.
- [ ] For the paste to tabs (***Clerk Tabs***), I need a paste that starts where you're currently to where you can append to data that's already there without changing anything before where you're at.