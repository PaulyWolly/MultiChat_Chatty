# handleScroll Method Documentation

## Overview

`handleScroll` is the **centralized scroll logic** for all chat result types in the MultiChat_Chatty app. It ensures the correct scroll behavior after rendering any result in the chat UI, providing a consistent and robust user experience.

---

## Purpose

- **Scroll to TOP** for YouTube results, images, or recipes.
- **Scroll to BOTTOM** for all other content (e.g., time/date queries, jokes, MyJokes, general chat).
- Should be the **only place** scroll-to-top/bottom logic is implemented for chat results.

---

## Usage

Call `handleScroll({ content, options, role })` after rendering any result in the chat.

- This is automatically done in `addMessageToChat` for all main result types.
- If you add new result types or custom rendering, always call `handleScroll` after rendering.

---

## Parameters

| Name     | Type   | Description                                                      |
|----------|--------|------------------------------------------------------------------|
| content  | string/object | The message content (string or object)                        |
| options  | object | Metadata about the message (e.g., isYoutube, isRecipe, isImageQuery) |
| role     | string | 'user' or 'assistant'                                            |

---

## Scroll Behavior

- **YouTube, images, recipes:**
  - Always scrolls to the **top** of the results/chat area.
  - Detects these types via `options` or content heuristics.
  - Uses YouTubeSearchManager's `scrollToYouTubeResults` if available, otherwise scrolls chat container/window to top.

- **All other content:**
  - Always scrolls to the **bottom** so the latest content is visible as it is generated.
  - Uses multiple timeouts to ensure streaming/async content stays in view.

---

## Example

```js
// After rendering a result in the chat:
handleScroll({
  content: resultContent,
  options: { isYoutube: true }, // or isRecipe, isImageQuery, etc.
  role: 'assistant'
});
```

---

## Best Practices

- **Do not** implement direct scroll-to-top/bottom logic elsewhere for chat results.
- Always use `handleScroll` to ensure consistent behavior and future maintainability.
- If you add new result types, update `handleScroll` if special scroll logic is needed.

---

## Location

- Defined in: `public/app.js`
- Called automatically in: `addMessageToChat`

---

## Maintainers

- Update this documentation if scroll logic or usage patterns change. 