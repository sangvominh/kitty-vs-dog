# Feature Specification: Custom Character & Monster Sprite System

**Feature Branch**: `002-custom-character-sprites`  
**Created**: 2026-02-15  
**Status**: Draft  
**Input**: User description: "UI: hệ thống custom nhân vật và quái vật: cho phép upload nhiều ảnh lên (lưu ở thư mục local, ignore khỏi git), chia ra hai list ảnh nhân vật riêng theo thứ tự, ảnh đó sẽ thay vào cho nhân vật tương ứng, khi lên level thì sẽ tự đổi sang ảnh tiếp theo, kích cỡ ảnh vừa đủ nhìn (bự hơn các khối hiện tại xíu), có thêm các hiệu ứng khi lên cấp như viền màu, lửa rực ..."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Upload Custom Sprites for Characters (Priority: P1)

As a player, I want to upload my own images for the two characters (Kitty and Doggo/MSmini) so that I can personalize how they look in the game. I open a customization UI screen before starting a game, select "Kitty" or "Doggo" character slot, then upload multiple images in the order I want them to appear. Each image in the ordered list corresponds to a level — the first image is the character's appearance at level 1, the second at level 2, and so on. Once I confirm, the game uses my uploaded images instead of the default geometric shapes.

**Why this priority**: This is the core feature — without sprite upload and assignment, there is nothing to customize. It delivers the fundamental value of personalization.

**Independent Test**: Can be fully tested by opening the customization UI, uploading 3 images for Kitty and 3 for Doggo, starting a game, and verifying that level-1 sprites appear correctly on both characters.

**Acceptance Scenarios**:

1. **Given** the player is on the customization screen, **When** they select the Kitty character slot and upload 3 images, **Then** the images appear as an ordered list with thumbnails labeled Level 1, Level 2, Level 3.
2. **Given** the player has uploaded images for Kitty, **When** they select the Doggo character slot and upload 2 images, **Then** the Doggo slot shows its own separate ordered list independent of Kitty's images.
3. **Given** images are uploaded for both characters, **When** the player starts a new game, **Then** each character displays their Level 1 custom sprite instead of the default geometric shape.
4. **Given** the player uploads no custom images for a character, **When** the game starts, **Then** the default geometric shape is used for that character.

---

### User Story 2 - Level-Based Sprite Progression (Priority: P1)

As a player, I want my characters to automatically change their appearance to the next uploaded image each time they level up, creating a visual evolution throughout the game. When a character levels up, their sprite swaps to the next image in the ordered list. If the character's level exceeds the number of uploaded images, the last uploaded image remains in use.

**Why this priority**: This is tightly coupled with the upload system and represents the core "progression feels personal" experience. Without it, uploading multiple images has no purpose.

**Independent Test**: Can be tested by uploading 3 images for a character, starting a game, collecting enough coins to trigger 3 level-ups, and verifying the sprite changes each time.

**Acceptance Scenarios**:

1. **Given** a character has 3 custom sprites uploaded and is at Level 1, **When** the player levels up to Level 2, **Then** the character's in-game sprite changes to the 2nd image in the list.
2. **Given** a character has 3 custom sprites and reaches Level 3, **When** the player levels up again to Level 4, **Then** the character keeps the 3rd (last) image since no 4th image exists.
3. **Given** the character levels up, **When** the sprite transition happens, **Then** it occurs immediately upon the level-up event with no visible loading delay.

---

### User Story 3 - Upload Custom Sprites for Enemies (Priority: P2)

As a player, I want to upload custom images for each enemy type (Bill, Deadline, Ex-Lover) so that I can personalize the entire game experience. Each enemy type has its own image list that works the same way as character sprites — ordered by wave/difficulty progression. As waves increase, enemy sprites can progress through the uploaded image list.

**Why this priority**: Extends the customization to the full game experience. Less critical than character customization since enemies are secondary actors.

**Independent Test**: Can be tested by uploading 2 images for the "Bill" enemy type, starting a game, and verifying the first wave enemies use image 1 and later waves use image 2.

**Acceptance Scenarios**:

1. **Given** the player is on the customization screen, **When** they select an enemy type (e.g., Bill) and upload 2 images, **Then** the images appear in an ordered list for that enemy type.
2. **Given** custom sprites are uploaded for an enemy type, **When** the game starts, **Then** enemies of that type display the first custom sprite.
3. **Given** multiple enemy sprites are uploaded, **When** the wave number increases beyond a progression threshold, **Then** enemies evolve to the next sprite in the list.
4. **Given** no custom sprites are uploaded for an enemy type, **When** that enemy spawns, **Then** the default geometric shape is used.

---

### User Story 4 - Level-Up Visual Effects (Priority: P2)

As a player, I want eye-catching visual effects to play when a character levels up — such as a glowing colored border around the character, fire/flame effects, sparkles, or a brief aura — so that level-ups feel impactful and rewarding. These effects should be visible for a few seconds after leveling up and subtly persist (e.g., a thin colored border) to indicate the character's current power tier.

**Why this priority**: Visual polish that significantly enhances the feel of progression. Important for player satisfaction but the game is functional without it.

**Independent Test**: Can be tested by triggering a level-up event and verifying that visual effects (border glow, particle effects) appear around the character for the expected duration.

**Acceptance Scenarios**:

1. **Given** a character levels up, **When** the level-up occurs, **Then** a burst visual effect (e.g., expanding ring of fire/sparkles) plays around the character for 2-3 seconds.
2. **Given** a character has leveled up, **When** the burst effect ends, **Then** a persistent subtle indicator remains (e.g., a thin colored border or soft glow that changes color based on level tier).
3. **Given** a character is at a higher level tier, **When** they level up again, **Then** the effect intensity or color changes to reflect the new tier (e.g., blue glow → purple glow → golden glow → fiery aura).
4. **Given** a character uses default sprites (no custom upload), **When** they level up, **Then** the visual effects still play normally around the geometric shape.

---

### User Story 5 - Sprite Size & Display (Priority: P2)

As a player, I want my custom sprite images to appear at a comfortable size that is slightly larger than the current geometric shapes, so that the detail in my uploaded images is visible during gameplay. The sprites should be appropriately scaled and maintain their aspect ratio.

**Why this priority**: Essential for the visual quality of custom sprites — images that are too small lose their detail and defeat the purpose of customization.

**Independent Test**: Can be tested by uploading a custom image, starting the game, and visually confirming the sprite is noticeably larger than the default shapes while not overlapping other game elements excessively.

**Acceptance Scenarios**:

1. **Given** a custom sprite is loaded for a character, **When** the game renders it, **Then** the sprite displays at approximately 48x48 pixels (compared to the current 32x32 default), maintaining aspect ratio.
2. **Given** a custom sprite is loaded for an enemy, **When** it spawns, **Then** its display size is proportionally scaled up from the current default enemy size.
3. **Given** the player uploads an image with non-square dimensions, **When** it renders in-game, **Then** the image is scaled to fit within the target display bounds while preserving aspect ratio (no stretching/squishing).

---

### User Story 6 - Reorder and Remove Uploaded Sprites (Priority: P3)

As a player, I want to reorder or remove images from my uploaded sprite lists so that I can fine-tune the level progression order or fix mistakes. I can drag images to rearrange them or click a remove button to delete an image from the list.

**Why this priority**: Quality-of-life improvement for the customization workflow. The feature is usable without it (player can re-upload), but it significantly improves the experience.

**Independent Test**: Can be tested by uploading 3 images, dragging the 3rd image to position 1, and verifying the list order updates. Then removing the 2nd image and verifying it disappears from the list.

**Acceptance Scenarios**:

1. **Given** a character slot has 3 uploaded images, **When** the player drags the 3rd image above the 1st, **Then** the list reorders to show the former 3rd image as Level 1.
2. **Given** a character slot has 3 uploaded images, **When** the player clicks the remove button on the 2nd image, **Then** the image is removed and the remaining images shift to fill the gap (former 3rd becomes 2nd).
3. **Given** the player removes all images from a character slot, **When** the game starts, **Then** the default geometric shape is used for that character.

---

### Edge Cases

- What happens when the player uploads a very large image file (e.g., 10MB+)? The system should reject files over a reasonable limit (5MB per image) and show an error message.
- What happens when the player uploads a non-image file (e.g., .txt, .pdf)? The system should validate file type and only accept common image formats (PNG, JPG, JPEG, GIF, WebP).
- What happens when the uploaded image is corrupted or cannot be decoded? The system should display an error and skip the image, leaving the slot empty or using the default.
- What happens when the local storage folder is deleted externally between sessions? The system should gracefully fall back to default sprites and inform the player that their custom images are missing.
- What happens if the player uploads the same image multiple times? The system should allow it (player may want the same image for multiple levels).
- What happens when the game window is resized? Custom sprites should scale proportionally along with all other game elements (existing FIT scaling behavior).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a customization UI screen accessible before starting a game (e.g., via a "Customize" button on the main/start screen).
- **FR-002**: System MUST allow players to upload multiple image files (PNG, JPG, JPEG, GIF, WebP) per character slot (Kitty, Doggo).
- **FR-003**: System MUST allow players to upload multiple image files per enemy type slot (Bill, Deadline, Ex-Lover).
- **FR-004**: System MUST store uploaded images in a designated local directory on the user's machine, separate from the game distribution files.
- **FR-005**: The local image storage directory MUST be excluded from version control (git-ignored).
- **FR-006**: System MUST organize uploaded images into separate ordered lists — one per character and one per enemy type — maintaining the player-defined sequence.
- **FR-007**: System MUST replace the in-game sprite of a character/enemy with the corresponding custom image from the ordered list, based on the character's current level (for characters) or wave progression (for enemies).
- **FR-008**: When a character levels up, the system MUST automatically swap the character's sprite to the next image in that character's ordered list.
- **FR-009**: If the character's level exceeds the number of uploaded images, the system MUST continue displaying the last image in the list.
- **FR-010**: Custom sprites MUST display at a size slightly larger than current default geometric shapes — approximately 48x48 pixels for characters (up from 32x32) and proportionally scaled for enemies.
- **FR-011**: Custom sprite images MUST maintain their original aspect ratio when scaled to the display size (no distortion).
- **FR-012**: System MUST play a burst visual effect (e.g., expanding sparkle ring, fire burst) around a character when they level up, lasting 2-3 seconds.
- **FR-013**: System MUST display a persistent subtle visual indicator (e.g., colored border or glow) on characters after level-up that reflects their current level tier.
- **FR-014**: Level-up visual effects MUST escalate in intensity or change color across level tiers (e.g., Tier 1: blue glow, Tier 2: purple glow, Tier 3: golden glow, Tier 4+: fiery aura).
- **FR-015**: System MUST validate uploaded files: reject non-image formats and files exceeding 5MB, showing a clear error message.
- **FR-016**: System MUST allow players to reorder images within a character/enemy sprite list via drag-and-drop.
- **FR-017**: System MUST allow players to remove individual images from a sprite list.
- **FR-018**: System MUST persist the sprite configuration (image paths and order) across sessions so players do not have to re-upload each time they play.
- **FR-019**: If previously uploaded images are missing from disk (e.g., deleted externally), the system MUST gracefully fall back to default sprites and notify the player.
- **FR-020**: Level-up visual effects MUST work identically whether the character uses custom sprites or default geometric shapes.

### Key Entities

- **Sprite Configuration**: Represents the complete set of custom sprite assignments for all characters and enemies. Contains an ordered list of image references per character/enemy slot, the current active image index per slot, and display size preferences.
- **Sprite Slot**: Represents a single character or enemy type that can be customized. Has an identifier (e.g., "kitty", "doggo", "bill", "deadline", "ex-lover"), an ordered list of image references, and a progression rule (level-based for characters, wave-based for enemies).
- **Custom Image**: An individual uploaded image. Has a file reference (local path), display name, file size, dimensions, upload order position, and validation status.
- **Level Tier**: Defines visual effect brackets. Groups levels into tiers (e.g., Level 1-2 = Tier 1, Level 3-4 = Tier 2, etc.) that determine which visual effect style is shown.

## Assumptions

- The game currently uses geometric primitives (circles, rectangles, triangles) as character and enemy sprites, generated at runtime via the AssetManifest system. Custom sprites will override these textures.
- The game runs as a local desktop/browser application where file system access is available for storing uploaded images.
- Level-ups are triggered by coin collection thresholds (existing mechanic). The sprite progression piggybacks on this existing system.
- For enemy sprite progression, waves (managed by WaveSystem) serve as the progression trigger — e.g., every N waves, enemies advance to the next sprite in their list.
- The customization UI will be built as a React overlay (consistent with existing UI overlays like HUD, LevelUpOverlay, GameOverOverlay).
- Display sizes: Characters scale from 32x32 to ~48x48. Enemies scale proportionally (e.g., bill 28x28 → ~40x40, deadline 24x24 → ~36x36, ex-lover 48x48 → ~64x64).
- Drag-and-drop reordering uses standard web interaction patterns familiar to users.
- Image persistence uses browser-standard storage mechanisms (e.g., IndexedDB or file references with a config file) — specifics left to implementation.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Players can upload, assign, and see custom sprites for both characters within 2 minutes of opening the customization screen.
- **SC-002**: Character sprites correctly transition to the next uploaded image on every level-up event with zero visible loading delay.
- **SC-003**: All 5 entity types (2 characters + 3 enemy types) support independent custom sprite lists.
- **SC-004**: Level-up visual effects are visible and distinguishable across at least 4 level tiers.
- **SC-005**: Custom sprites persist across game sessions — a player who uploads images and closes the game sees the same sprites when reopening.
- **SC-006**: The game maintains its current frame rate (60 FPS) with custom sprites loaded for all 5 entity types.
- **SC-007**: Invalid uploads (wrong format, oversized files) are rejected with a clear error message 100% of the time.
- **SC-008**: Custom sprites render at the correct increased size (~48x48 for characters) with no aspect ratio distortion.
