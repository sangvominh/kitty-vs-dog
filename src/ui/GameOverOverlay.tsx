import { useGameStore } from '../game/state/gameStore';

export function GameOverOverlay() {
  const gameState = useGameStore((s) => s.gameState);

  if (gameState !== 'game-over') return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 pointer-events-auto">
      <div className="bg-gray-900/90 rounded-2xl p-8 text-center">
        <h2 className="text-4xl font-bold text-red-500 mb-4">Game Over</h2>
        <p className="text-gray-300 text-lg mb-6">The deadlines finally caught up...</p>
        <button
          className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-8 rounded-xl transition-colors"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
