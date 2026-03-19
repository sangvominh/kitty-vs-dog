## 2026-03-17 - [Missing ARIA Labels on Icon-only Buttons]
**Learning:** The application extensively uses Material Icons for buttons (e.g., in HUD, DifficultySelect, CustomizeOverlay) without providing aria-labels or titles, which makes these key interactions completely inaccessible to screen reader users and confusing for users relying on tooltips.
**Action:** Always verify that every button containing only an icon (like a span className=material-icons-round) has a descriptive aria-label and title added as a standard practice.

## 2024-05-24 - Hidden Input Labels & Hover Actions
**Learning:** Using `<label>` elements connected to hidden (`display: none` or `visibility: hidden`) `<input type="file">` elements breaks keyboard navigation, as the input cannot receive focus and the label itself is not focusable by default. Additionally, buttons that appear only on hover (e.g., `opacity-0 group-hover:opacity-100`) are invisible to keyboard users when focused unless explicitly handled.
**Action:** Always replace `<label>`-based file upload triggers with `<button type="button">` elements that programmatically click the hidden input and have proper `focus-visible` styles. For hover-revealed actions, always append `focus-visible:opacity-100` alongside standard focus ring classes to ensure they appear when tabbed to.
