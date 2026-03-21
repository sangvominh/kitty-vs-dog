## 2026-03-17 - [Missing ARIA Labels on Icon-only Buttons]
**Learning:** The application extensively uses Material Icons for buttons (e.g., in HUD, DifficultySelect, CustomizeOverlay) without providing aria-labels or titles, which makes these key interactions completely inaccessible to screen reader users and confusing for users relying on tooltips.
**Action:** Always verify that every button containing only an icon (like a span className=material-icons-round) has a descriptive aria-label and title added as a standard practice.

## 2026-03-21 - [Hidden File Inputs via Label vs Button]
**Learning:** Using a `<label>` to wrap a hidden file input `<input type="file" className="hidden" />` breaks keyboard navigation because the label itself is not focusable and the hidden input cannot receive focus.
**Action:** Always replace `<label>` wrappers for hidden file inputs with `<button type="button">`, trigger the input click programmatically via `onClick`, and apply `focus-visible` styles to ensure full keyboard accessibility.
