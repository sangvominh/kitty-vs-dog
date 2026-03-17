## 2026-03-17 - [Missing ARIA Labels on Icon-only Buttons]
**Learning:** The application extensively uses Material Icons for buttons (e.g., in HUD, DifficultySelect, CustomizeOverlay) without providing aria-labels or titles, which makes these key interactions completely inaccessible to screen reader users and confusing for users relying on tooltips.
**Action:** Always verify that every button containing only an icon (like a span className=material-icons-round) has a descriptive aria-label and title added as a standard practice.
