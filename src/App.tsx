import { PhaserGame } from './game/PhaserGame';
import { HUD } from './ui/HUD';
import { LevelUpOverlay } from './ui/LevelUpOverlay';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { PauseOverlay } from './ui/PauseOverlay';
import { CustomizeOverlay } from './ui/CustomizeOverlay';
import { DifficultySelect } from './ui/DifficultySelect';
import { useGameStore } from './game/state/gameStore';
import { useSpriteStore } from './game/state/spriteStore';
import { useSettingsStore } from './lib/settingsStore';
import { useBackgroundStore } from './game/state/backgroundStore';
import { useEffect } from 'react';

function App() {
  const gameState = useGameStore((s) => s.gameState);
  const showCustomize = useGameStore((s) => s.showCustomize);
  const setShowCustomize = useGameStore((s) => s.setShowCustomize);

  // Settings store (difficulty, menu screen)
  const screen = useSettingsStore((s) => s.screen);
  const setScreen = useSettingsStore((s) => s.setScreen);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const loadFromStorage = useSettingsStore((s) => s.loadFromStorage);

  // Load sprite config on mount
  const loadConfig = useSpriteStore((s) => s.loadConfig);
  const isLoaded = useSpriteStore((s) => s.isLoaded);

  // Load background settings on mount
  const bgLoaded = useBackgroundStore((s) => s.isLoaded);
  const loadBgSettings = useBackgroundStore((s) => s.loadFromStorage);

  // Load settings from IndexedDB on mount
  useEffect(() => {
    if (!settingsLoaded) {
      loadFromStorage();
    }
  }, [settingsLoaded, loadFromStorage]);

  useEffect(() => {
    if (!isLoaded) {
      loadConfig();
    }
  }, [isLoaded, loadConfig]);

  useEffect(() => {
    if (!bgLoaded) {
      loadBgSettings();
    }
  }, [bgLoaded, loadBgSettings]);

  // Customize overlay (shared between menu and in-game)
  if (showCustomize || screen === 'customizing') {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-gray-50">
        <CustomizeOverlay
          onClose={() => {
            setShowCustomize(false);
            if (screen === 'customizing') {
              setScreen('main-menu');
            }
          }}
        />
      </div>
    );
  }

  // Main menu — show before game starts
  if (screen === 'main-menu') {
    return (
      <div className="relative w-screen h-screen overflow-hidden">
        <DifficultySelect
          onPlay={() => setScreen('playing')}
          onCustomize={() => setScreen('customizing')}
        />
      </div>
    );
  }

  // In-game screen
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <PhaserGame />
      <HUD />

      {gameState === 'paused' && <PauseOverlay />}
      {gameState === 'level-up' && <LevelUpOverlay />}
      {gameState === 'game-over' && <GameOverOverlay />}
    </div>
  );
}

export default App;
