import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../lib/settingsStore';
import { getDifficulty } from '../game/state/difficultyConfig';

export function PauseOverlay() {
  const gameState = useGameStore((s) => s.gameState);
  const setGameState = useGameStore((s) => s.setGameState);
  const setShowCustomize = useGameStore((s) => s.setShowCustomize);
  const setScreen = useSettingsStore((s) => s.setScreen);
  const difficultyId = useSettingsStore((s) => s.difficultyId);
  const diff = getDifficulty(difficultyId);

  if (gameState !== 'paused') return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-[340px] frosted-glass rounded-2xl p-6 text-center animate-fade-in-up shadow-lg">
        {/* Icon + Title */}
        <span className="material-icons-round text-[var(--color-primary)] text-4xl mb-2 block">
          pause_circle
        </span>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-1">Tạm Dừng</h2>
        <p className="text-xs text-slate-400 mb-6 flex items-center justify-center gap-1">
          <span>{diff.icon}</span>
          <span className="font-semibold">{diff.name}</span>
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setGameState('playing')}
            className="w-full py-3 px-6 rounded-full bg-[var(--color-primary)] hover:bg-blue-600 text-white font-extrabold text-base shadow-lg shadow-[var(--color-primary)]/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-icons-round text-xl">play_arrow</span>
            Tiếp tục
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 rounded-full glass-panel hover:bg-white/80 font-bold text-slate-600 text-sm transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200/60"
          >
            <span className="material-icons-round text-base">replay</span>
            Chơi lại
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setGameState('playing');
                setShowCustomize(true);
              }}
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
