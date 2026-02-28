# Captain Clerk Design Doc

## Things to implement
- [ ] For data entry, excel sometimes uses ` - ` to indicate zero in certain formats. We already trim the possible inputs, but we should either ignore the `-` or input zero in it's place. Currently throwing error.

- [ ] Way to quickly navigate tax returns when sidebar is hidden. Like `ctrl+right and left` which will unhide the panel temporarily, select the next or last form. And maybe a fuzzy finder for all forms?

- [ ] We've gotten the paste, how about the copy? `CTLR+SHIFT+C`

- [ ] Something that will toggle the possible inputs and style them (like red box around). This will be useful to see what boxes can be copied and pasted from, to build a schema for import with right columns, etc.

- [ ] Maybe some UI and UX--currently, everything is set up using hotkeys which are fine, but may be hard for my older partner.

- [ ] Should I include Playwright-CRX? Split out for now? That way I can run my full-on playwright scraping scripts directly from browser.


## Hotkeys

* CTRL+SHIFT+L --> On tax return page, hide sidebar.
* CTRL+SHIFT+V --> Custom paste. Probably coolest part of it.
* ALT+SHIFT+END --> Clears all data in sensed grid of inputs
* ALT+SHIFT+DEL --> Delete all row data until it's gone
* ALT+DEL --> Delete current row
