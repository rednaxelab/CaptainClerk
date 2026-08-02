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
| `ALT+SHIFT+L` |Copy all "View All" list data to clipboard in TSV Format.|

## Things to implement

- [ ] Make it work on mac with command button in place of control button?
- [ ] Add interaction with dropdown menus and possibly checkboxes?
- [ ] Parse clipboard numbers such as `( 1,254.23 )` to compatible entry such as `1254.23` or `1254`. Not sure how opinionated I was about decimals.
- [ ] Get all K-1 input data (***Clerk Tabs***) and copy it into clipboard (basically going backward for comparison). Possilbe `alt+shift+c`?
- [ ] BUG: Look at JLIN. `ctrl/cmd+shift+up/down` bugs out as I think multiple K-1s with same name. Need to address. It works on main k-1 input screen, but did not somewhere on the main tab (where you select taxpayer vs spouse, etc and enter EIN).
- [ ] UI maybe from extension shortcut in toolbar that shows all current hotkeys.

### <u>Other wish list items</u>

- [ ] Tax Return Window: Way to quickly navigate tax returns when sidebar is hidden. Like `ctrl+shift+up and down` which will unhide the panel temporarily, select the next or last form. And maybe a fuzzy finder for all forms? But that can wait until later. And quickly scoll pages. It's currently clunky as fuck.
- [ ] Something that will toggle the possible inputs and style them (like red box around). This will be useful to see what boxes can be copied and pasted from, to build a schema for import with right columns, etc.
- [ ] Maybe some UI and UX--currently, everything is set up using hotkeys which are fine, but may be hard for my older partner.
- [ ] For the paste to tabs (***Clerk Tabs***), I need a paste that starts where you're currently to where you can append to data that's already there without changing anything before where you're at.
- [ ] The normal clerk paste (not tabs) short circuits if you copy a blank cell from excel. I think that is because it is left out of TSV. 
