import { PhaserGame } from './game/PhaserGame';
import { HUD } from './ui/HUD';
import { LevelUpOverlay } from './ui/LevelUpOverlay';
import { GameOverOverlay } from './ui/GameOverOverlay';
import { useGameStore } from './game/state/gameStore';

function App() {
  const gameState = useGameStore((s) => s.gameState);

  return (
    <div className="relative w-[1280px] h-[720px] mx-auto overflow-hidden">
      <PhaserGame />
      <HUD />
      {gameState === 'level-up' && <LevelUpOverlay />}
      {gameState === 'game-over' && <GameOverOverlay />}
    </div>
  );
}

export default App;
