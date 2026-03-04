# Captain Clerk Design Doc

## Explanation of design split and name

***Clerk*** class: Is basically some simple functionality with JS and DOM to make my life easier.

***Captain*** class: Is playwright stuff (more complex) -- built right into the browser and involved need for more advanced scraping, etc. This is currently unimplemented. I want to look at `Playwright-CRX` for this.

## Currently Implemented Hotkeys for *Clerk*

| HOTKEY | DESCRIPTION |
| :----: | :---------: |
|`CTRL+SHIFT+L`|On tax return page, hide sidebar.|
|`CTRL+SHIFT+V`|Custom paste. Probably coolest part of it.|
| `ALT+SHIFT+C` | Custom copy! Opposite of the paste--grabs all values to paste to spreadsheet.|
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

## Things to implement

- [ ] Tax Return Window: Way to quickly navigate tax returns when sidebar is hidden. Like `ctrl+shift+up and down` which will unhide the panel temporarily, select the next or last form. And maybe a fuzzy finder for all forms? But that can wait until later.
- [ ] K-1 input type thing where you copy values and it enters one, switches tab, enters next, etc.
- [ ] Something that will toggle the possible inputs and style them (like red box around). This will be useful to see what boxes can be copied and pasted from, to build a schema for import with right columns, etc.
- [ ] Maybe some UI and UX--currently, everything is set up using hotkeys which are fine, but may be hard for my older partner.
- [ ] Should I include Playwright-CRX? Split out for now? That way I can run my full-on playwright scraping scripts directly from browser.
