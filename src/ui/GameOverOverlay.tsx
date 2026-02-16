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
  const setShowCustomize = useGameStore((s) => s.setShowCustomize);
  const difficultyId = useSettingsStore((s) => s.difficultyId);
  const setScreen = useSettingsStore((s) => s.setScreen);
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
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-[420px] frosted-glass rounded-2xl p-8 text-center animate-fade-in-up shadow-lg">
        {/* Game Over Title */}
        <div className="mb-2">
          <span className="material-icons-round text-red-400 text-5xl mb-2 block">
            sentiment_very_dissatisfied
          </span>
          <h2 className="text-3xl font-extrabold text-slate-800">Trận Đấu Kết Thúc</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6 flex items-center justify-center gap-2">
          <span>{diffConfig.icon}</span>
          <span className="font-semibold">{diffConfig.name}</span>
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            icon="waves"
            label="Đợt"
            value={String(waveNumber)}
            color="text-[var(--color-primary)]"
          />
          <StatCard icon="trending_up" label="Cấp" value={String(level)} color="text-purple-500" />
          <StatCard icon="paid" label="Xu" value={String(coins)} color="text-amber-500" />
        </div>

        {/* Time */}
        <div className="frosted-glass rounded-xl px-4 py-2 mb-8 inline-flex items-center gap-2">
          <span className="material-icons-round text-slate-400 text-sm">timer</span>
          <span className="text-lg font-black text-slate-700 tabular-nums">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 px-6 rounded-full bg-[var(--color-primary)] hover:bg-blue-600 text-white font-extrabold text-base shadow-lg shadow-[var(--color-primary)]/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-icons-round text-xl">replay</span>
            Chơi Lại
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCustomize(true)}
              className="flex-1 py-3 px-4 rounded-full glass-panel hover:bg-white/80 font-bold text-slate-600 text-sm transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200/60"
            >
              <span className="material-icons-round text-base">checkroom</span>
              Trang phục
            </button>
            <button
              onClick={() => setScreen('main-menu')}
              className="flex-1 py-3 px-4 rounded-full glass-panel hover:bg-white/80 font-bold text-slate-600 text-sm transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200/60"
            >
              <span className="material-icons-round text-base">home</span>
              Trở về
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white/40 rounded-xl py-3 px-2 border border-white/60">
      <span className={`material-icons-round text-lg ${color} mb-1 block`}>{icon}</span>
      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</div>
      <div className="text-2xl font-black text-slate-800 tabular-nums">{value}</div>
    </div>
  );
}
