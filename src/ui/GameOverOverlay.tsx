import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../lib/settingsStore';
import { getDifficulty } from '../game/state/difficultyConfig';
import { recordGameEnd } from '../lib/settingsStorage';
import { useEffect } from 'react';

export function GameOverOverlay() {
  const gameState = useGameStore((s) => s.gameState);
  const waveNumber = useGameStore((s) => s.waveNumber);
  const coins = useGameStore((s) => s.coins);
  const level = useGameStore((s) => s.level);
  const elapsedTime = useGameStore((s) => s.elapsedTime);
  const difficultyId = useSettingsStore((s) => s.difficultyId);
  const diffConfig = getDifficulty(difficultyId);

  useEffect(() => {
    if (gameState === 'game-over') {
      recordGameEnd(waveNumber, difficultyId).catch(console.warn);
    }
  }, [gameState, waveNumber, difficultyId]);

  if (gameState !== 'game-over') return null;

  const minutes = Math.floor(elapsedTime / 60000);
  const seconds = Math.floor((elapsedTime % 60000) / 1000);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="w-[360px] bg-white/[0.06] backdrop-blur-xl rounded-3xl p-6 text-center">
        <h2 className="text-2xl font-semibold text-white/90 mb-1">Game Over</h2>
        <p className="text-[13px] text-white/40 mb-5">
          {diffConfig.icon} {diffConfig.name}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="Wave" value={String(waveNumber)} />
          <Stat label="Level" value={String(level)} />
          <Stat label="Coins" value={String(coins)} />
        </div>

        <p className="text-[13px] text-white/40 font-mono mb-6">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </p>

        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-2xl bg-white/90 text-[#0a0a0f] text-[15px] font-semibold transition-all hover:bg-white active:scale-[0.98]"
        >
          Chơi Lại
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] py-2">
      <div className="text-[11px] text-white/30">{label}</div>
      <div className="text-[18px] font-semibold text-white/80 font-mono">{value}</div>
    </div>
  );
}
