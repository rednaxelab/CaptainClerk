================================================================================
TECHNICAL SUMMARY: RUNNING PLAYWRIGHT IN CHROME EXTENSIONS (PLAYWRIGHT-CRX)
================================================================================

1. ARCHITECTURAL OVERVIEW
--------------------------------------------------------------------------------
Standard Playwright (@playwright/test) is a Node.js-based framework. It cannot 
run "as-is" inside a Chrome Extension because extensions operate within a 
browser-based Service Worker (Manifest V3) or Background Page (Manifest V2) 
that lacks Node.js primitives like 'fs', 'child_process', and 'net'.

'playwright-crx' is a community-driven adaptation that solves this by:
* Transpiling the Playwright API: Adapting core logic to a browser environment.
* CDP Transport: Instead of launching a browser binary, it connects to the 
  current browser's Chrome DevTools Protocol (CDP) via 'chrome.debugger'.
* Execution Context: It runs as a library within your extension's background 
  process, allowing native scripting of tab interactions.

2. INSTALLATION & BUNDLING
--------------------------------------------------------------------------------
Since extensions do not support bare 'require' or 'import' of Node modules, 
you must bundle the library using a tool like Webpack, Vite, or Rollup.

Step 1: Install the package
$ npm install playwright-crx

Step 2: Manifest Configuration
You must grant the extension permission to use the debugger and access tabs.

// manifest.json
{
  "manifest_version": 3,
  "name": "Playwright Extension",
  "permissions": ["debugger", "tabs"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}

3. CORE IMPLEMENTATION (SERVICE WORKER)
--------------------------------------------------------------------------------
In Manifest V3, use the following pattern to automate a tab.

import { crx } from 'playwright-crx';

async function runAutomation(tabId) {
  // 1. Attach to the specific tab via the CRX bridge
  const browser = await crx.attach(tabId);
  
  // 2. Access the default context and page
  const context = browser.contexts()[0];
  const page = context.pages()[0];

  // 3. Perform standard Playwright actions
  await page.goto('https://example.com');
  await page.fill('input[name="search"]', 'Playwright-CRX');
  await page.click('button#submit');

  // 4. Cleanup
  await browser.detach();
}

4. ADVANCED USE CASES
--------------------------------------------------------------------------------

A. MULTI-TAB SCRAPING
Iterate through open tabs to extract data across different domains.

async function scrapeAllTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url.startsWith('http')) {
      const browser = await crx.attach(tab.id);
      const page = browser.pages()[0];
      console.log(`Scraping: ${await page.title()}`);
      await browser.detach();
    }
  }
}

B. HANDLING NATIVE DIALOGS
Unlike standard Content Scripts, playwright-crx can interact with alerts.

page.on('dialog', async dialog => {
  console.log('Dialog message:', dialog.message());
  await dialog.accept();
});

5. COMPARISON: IMPLEMENTATION VS. TESTING
--------------------------------------------------------------------------------
Feature           | playwright-crx (Library) | @playwright/test (Runner)
------------------|--------------------------|-------------------------
Environment       | Inside Extension (SW)    | Node.js / CLI
Control           | Existing Tabs            | Launches New Browser
Primary Goal      | User-facing Automation   | QA / E2E Testing
Browser Support   | Chromium Only            | Chromium, FF, WebKit
Headless          | No (Browser is open)     | Yes (Optional)

6. CRITICAL LIMITATIONS & WORKAROUNDS
--------------------------------------------------------------------------------
* SERVICE WORKER TIMEOUTS: 
  Chrome Service Workers terminate after ~30 seconds of inactivity. For long 
  scripts, use 'chrome.alarms' to keep the worker active.
  
* DEBUGGER NOTIFICATION: 
  Chrome displays a "Notification Bar" when the debugger is active. This 
  is a security feature and cannot be hidden programmatically.
  
* RESTRICTED PAGES: 
  The debugger cannot attach to 'chrome://' settings pages or the 
  Chrome Web Store.

* BUNDLE SIZE: 
  The library is large. Ensure your build pipeline uses tree-shaking 
  to keep the extension 'dist' folder lightweight.

7. TROUBLESHOOTING
--------------------------------------------------------------------------------
* Error: "Another debugger is already attached":
  Always wrap your automation in try/finally blocks to ensure 
  'browser.detach()' is called even if an error occurs.
  
* Selector Issues: 
  Extensions share the UI with the user. If a user clicks a different tab 
  while the script runs, the script may hang. Use 'page.waitForSelector' 
  with generous timeouts.

================================================================================
EOF
