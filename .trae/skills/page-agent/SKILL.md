---
name: "page-agent"
description: "Integrate Alibaba Page Agent for natural-language DOM control. Invoke when the user wants in-page UI automation or asks to execute DOM actions using NL."
---

# Page Agent Integration

This skill integrates the Alibaba Page Agent to enable natural-language control of web interfaces directly in the browser. It is embedded into the web app and can be invoked to perform DOM actions like clicking, typing, and navigating without screenshots or special browser permissions.

## What It Does
- Initializes and exposes a Page Agent client within the web application.
- Provides a UI panel to input natural-language instructions and execute them against the current page.
- Uses client-side JavaScript only; no headless browser is required.

## When to Invoke
- When the user asks to automate UI interactions using natural language.
- When tasks require DOM operations (click, type, select, submit forms) within the current page.
- When a quick in-page automation is preferred over external tools or extensions.

## How to Use
- Open the web app with `?panel=page-agent` or dispatch the custom event `open-page-agent`.
- Enter an instruction like "Click the login button" or "Type 'hello' in the search box and press Enter", then run.

## Configuration
- Environment variables:
  - `NEXT_PUBLIC_PAGE_AGENT_MODEL` (e.g., `qwen3.5-plus`)
  - `NEXT_PUBLIC_PAGE_AGENT_BASE_URL` (optional)
  - `NEXT_PUBLIC_PAGE_AGENT_API_KEY` (optional)
- The panel defaults to `navigator.language` when no language is specified.

## Programmatic API
Use the React hook to execute instructions inside components:

```ts
import { usePageAgent } from '@/hooks/usePageAgent'
const { execute } = usePageAgent()
await execute('Click the login button')
```
