# Permission Justification

## Required Permissions

### `activeTab`
This permission allows the extension to access the content of the currently active tab when the user interacts with the extension. It is used to:
- Detect the current website domain to match against configured AI platforms
- Query and extract user prompt elements from the page DOM
- Test custom CSS selectors before saving them

This permission is triggered only when the user clicks the extension icon or interacts with the sidebar, ensuring minimal access scope.

### `storage`
This permission allows the extension to store and retrieve user preferences and platform configurations. It is used to:
- Save custom CSS selector rules for different AI platforms
- Store enable/disable status for each platform rule
- Persist user settings across browser sessions

All data is stored locally using `chrome.storage.local` and never leaves the user's device.

### `scripting`
This permission allows the extension to inject scripts into web pages. It is used to:
- Test CSS selectors by executing query operations in the context of the current page
- Verify selector validity before saving user configurations

This permission is only used when the user explicitly tests a custom selector in the configuration popup.

---

## Host Permissions (`https://*/*`)

This extension requires access to all HTTPS websites for the following reasons:

### 1. Multi-Platform Support
Easy Copilot is designed to work across multiple AI chat platforms. New AI services emerge frequently, and users may use various platforms that are not pre-configured. Broad host permission ensures the extension can function on:
- Pre-supported platforms (ChatGPT, Claude, Gemini, DeepSeek, Kimi, Qwen, etc.)
- Any custom AI platform the user configures
- Future AI platforms without requiring extension updates

### 2. Content Script Injection
The extension injects a sidebar component into supported pages to:
- Display the navigation list of user prompts
- Provide real-time search functionality
- Enable one-click navigation to specific conversation points

This requires the content script to run on the target pages where AI conversations occur.

### 3. DOM Monitoring
To maintain an up-to-date navigation list, the extension uses `MutationObserver` to watch for DOM changes on the page. This allows it to:
- Detect new messages as they appear in real-time conversations
- Update the navigation list dynamically without page refresh

### Privacy Considerations
- The extension only activates on pages where a matching CSS selector configuration exists
- No user data or conversation content is collected, transmitted, or stored externally
- All configurations and cached data remain local to the user's browser
- The extension is open source, allowing full transparency and auditability
