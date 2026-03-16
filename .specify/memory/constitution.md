<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0 (initial ratification)
  Modified principles: N/A (initial)
  Added sections:
    - Core Principles (5 principles)
    - Tech Stack & Constraints
    - Development Workflow & Milestones
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed
      (Constitution Check section is dynamically filled at plan-time)
    - .specify/templates/spec-template.md ✅ no changes needed
      (generic user-story template compatible with game principles)
    - .specify/templates/tasks-template.md ✅ no changes needed
      (phase-based structure aligns with milestone workflow)
    - No command files found in .specify/templates/commands/
  Follow-up TODOs: None
-->

# Dây Tơ Hồng: The Deadline Survivors — Constitution

## Core Principles

### I. Tether-First Design (NON-NEGOTIABLE)

The elastic rope connecting the two players is the defining mechanic of
the game. Every gameplay feature MUST integrate with or respect the
tether physics constraint.

- All enemy AI, level design, and power-up systems MUST account for
  the tether's 300px max-distance spring constraint.
- The "Clothesline" attack (rope-contact damage) MUST remain a
  primary offensive strategy; no feature may diminish its viability.
- The "Love Reload" mechanic (player collision to heal/reload) MUST
  be the sole method for restoring ammo and health.
- Any new mechanic proposal MUST demonstrate how it interacts with
  or is affected by the tether before approval.

**Rationale:** The tether creates the core "chaotic cooperation"
experience. Mechanics that ignore it break the game's identity.

### II. Swap-Ready Assets

All visual rendering MUST be decoupled from game logic to support a
two-phase asset pipeline: geometric primitives first, sprite PNGs
second.

- Game entities MUST reference assets via a configuration layer (asset
  keys), never hardcoded image paths in gameplay code.
- Phase 1 primitives (Pink Circle, Brown Square, Red Triangles, White
  Line) MUST be sufficient to playtest all mechanics.
- Phase 2 sprite swap MUST require zero changes to physics, AI, or
  gameplay code — only asset manifest updates and image files in
  `/public/assets/`.
- Animation MUST be limited to simple squash-and-stretch tweens; no
  complex sprite-sheet animation pipelines are permitted unless
  explicitly approved.

**Rationale:** Rapid prototyping with primitives enables fast
iteration on gameplay feel before investing in art.

### III. Co-op Parity

Local co-op with two independent input schemes (WASD / Arrow keys)
MUST work without conflicts, and both players MUST have distinct,
balanced roles.

- Player 1 (Kitty, WASD) MUST fill the Ranged DPS role.
- Player 2 (Doggo, Arrows) MUST fill the Crowd Control / Melee role.
- Input handling MUST support simultaneous key presses from both
  players without ghosting or conflict.
- No single player may be self-sufficient; the "Love Reload" mechanic
  enforces mutual dependence by design.
- Role balance MUST be validated: neither player should feel
  significantly more or less powerful than the other during
  normal gameplay.

**Rationale:** The game is about cooperation under pressure. If one
player can solo effectively, the tether becomes a handicap instead
of a shared tool.

### IV. Humor-Driven Design

The "Ugly-Cute" meme aesthetic is the intentional art and tone
direction. Development MUST prioritize comedic physics chaos and
funny failure states over visual polish.

- Enemy design MUST lean into absurdist humor (floating dollar signs,
  alarm clocks, heartbreak stickmen labeled "EX").
- Game Over screens MUST display humorous Vietnamese-flavored quotes
  (e.g., "Chia tay vì nợ nần", "Bị người yêu cũ đánh bại").
- Physics interactions SHOULD produce exaggerated, funny results
  (ragdoll knockbacks, elastic snapping).
- Visual fidelity improvements MUST NOT delay gameplay feature
  delivery; aesthetics are Phase 2 work.

**Rationale:** The game's market differentiation is its comedic tone.
Over-polishing visuals at the expense of humor undermines the
core appeal.

### V. Incremental Milestones

Development MUST follow the 5-step milestone plan. Each milestone
MUST produce a playable, testable build.

- **Step 1:** React + Phaser project scaffold with build pipeline.
- **Step 2:** Two players with independent movement and tether
  physics (playable prototype).
- **Step 3:** Enemy spawning, collision logic, and tether/projectile
  damage (core gameplay loop).
- **Step 4:** Love Reload mechanic, health/ammo UI, and HUD
  (complete game loop).
- **Step 5:** Game Over screen, scoring, sound effects, and polish
  (shippable build).
- No milestone may introduce features belonging to a later step.
- Each milestone MUST be demoed and validated before proceeding.

**Rationale:** Incremental delivery de-risks the project; a playable
build at every stage ensures constant feedback and prevents
scope creep.

## Tech Stack & Constraints

- **Frontend Framework:** React (Vite) + TypeScript. All game UI
  overlays (Health, Score, Game Over) MUST use React components.
- **Game Engine:** Phaser 3. All game-world rendering, input, and
  update loops MUST run inside a Phaser Scene.
- **Physics Engine:** Matter.js is preferred for elastic tether
  constraints. Phaser Arcade Physics is acceptable only if
  Matter.js integration proves infeasible during Step 2.
- **State Management:** Zustand or React Context for bridging
  Phaser game state to React UI. Global mutable state outside
  these mechanisms is prohibited.
- **Styling:** TailwindCSS for all menu and HUD styling. Inline
  styles in React components are prohibited.
- **Asset Storage:** All game assets MUST reside in `/public/assets/`
  with a flat or single-depth folder structure.
- **Performance Target:** The game MUST maintain 60 FPS with up to
  50 simultaneous on-screen enemies on a mid-range laptop
  (integrated GPU, 8 GB RAM).
- **Browser Support:** Latest stable Chrome and Firefox. No IE or
  Safari-specific workarounds required.

## Development Workflow & Milestones

- **Branch Strategy:** Feature branches off `main`; merge via pull
  request with at least a self-review checklist.
- **Build Validation:** `npm run build` MUST succeed with zero
  TypeScript errors and zero ESLint warnings before any merge.
- **Playtest Gate:** Each milestone completion MUST include a local
  two-player playtest session confirming the milestone's acceptance
  criteria.
- **Asset Workflow:** Primitive assets are defined in code (Phase 1).
  Sprite PNGs are added to `/public/assets/` and registered in
  an asset manifest file (Phase 2). No binary assets in source
  directories.
- **Commit Discipline:** Commits MUST be atomic and descriptive.
  Format: `<type>(<scope>): <description>` (e.g.,
  `feat(tether): implement elastic spring constraint`).

## Governance

- This constitution supersedes all ad-hoc decisions. Any gameplay
  or architecture choice conflicting with these principles MUST
  be resolved in favor of the constitution, or the constitution
  MUST be formally amended first.
- **Amendment Procedure:** Propose the change in writing, document
  the rationale, update the version number per semantic versioning
  (MAJOR for principle removal/redefinition, MINOR for additions,
  PATCH for clarifications), and update `LAST_AMENDED_DATE`.
- **Compliance Review:** At each milestone checkpoint, verify that
  the current build does not violate any principle. Document any
  intentional deviations with justification in the milestone
  review notes.
- **Complexity Justification:** Any architectural addition not
  required by an active milestone MUST be justified against the
  Incremental Milestones principle (Principle V).

**Version**: 1.0.0 | **Ratified**: 2026-02-15 | **Last Amended**: 2026-02-15
