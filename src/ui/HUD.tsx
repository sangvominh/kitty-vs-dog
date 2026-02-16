import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../lib/settingsStore';
import { getDifficulty } from '../game/state/difficultyConfig';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function HUD() {
  const health = useGameStore((s) => s.health);
  const maxHealth = useGameStore((s) => s.maxHealth);
  const kittyAmmo = useGameStore((s) => s.kittyAmmo);
  const elapsedTime = useGameStore((s) => s.elapsedTime);
  const waveNumber = useGameStore((s) => s.waveNumber);
  const coins = useGameStore((s) => s.coins);
  const level = useGameStore((s) => s.level);
  const nextLevelThreshold = useGameStore((s) => s.nextLevelThreshold);
  const tetherDurability = useGameStore((s) => s.tetherDurability);
  const maxTetherDurability = useGameStore((s) => s.maxTetherDurability);
  const tetherBroken = useGameStore((s) => s.tetherBroken);
  const playersTouching = useGameStore((s) => s.playersTouching);
  const setShowCustomize = useGameStore((s) => s.setShowCustomize);
  const setGameState = useGameStore((s) => s.setGameState);
  const difficultyId = useSettingsStore((s) => s.difficultyId);
  const diff = getDifficulty(difficultyId);

  const healthPct = maxHealth > 0 ? (health / maxHealth) * 100 : 0;
  const tetherPct = maxTetherDurability > 0 ? (tetherDurability / maxTetherDurability) * 100 : 0;
  const xpPct = nextLevelThreshold > 0 ? Math.min(100, (coins / nextLevelThreshold) * 100) : 0;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-2 md:p-3 flex flex-col justify-between h-full w-full">
      {/* TOP: Thin XP bar */}
      <div className="absolute top-0 left-0 w-full pointer-events-none">
        <div className="h-1 w-full bg-black/10">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 via-[var(--color-primary)] to-purple-500 rounded-r-full transition-all duration-500"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>

      {/* TOP ROW: Compact info strip */}
      <div className="flex items-start justify-between w-full pt-2 gap-2">
        {/* LEFT: HP + Tether compact */}
        <div className="frosted-glass rounded-xl px-3 py-2 pointer-events-auto shadow-sm flex flex-col gap-1.5 min-w-[160px] max-w-[200px]">
          {/* HP bar */}
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-red-400 text-xs">favorite</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden ring-1 ring-black/5">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${healthPct}%`,
                  background:
                    healthPct > 60
                      ? 'linear-gradient(to right, #4ade80, #22c55e)'
                      : healthPct > 30
                        ? 'linear-gradient(to right, #facc15, #f59e0b)'
                        : 'linear-gradient(to right, #f87171, #ef4444)',
                }}
              >
                {playersTouching && !tetherBroken && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                )}
              </div>
            </div>
            <span className="text-[10px] font-bold text-gray-600 tabular-nums min-w-[28px] text-right">
              {health}
            </span>
          </div>

          {/* Tether bar */}
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-[var(--color-primary)] text-xs">link</span>
            {tetherBroken ? (
              <span className="text-[10px] font-bold text-red-500">ĐỨT</span>
            ) : (
              <>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden ring-1 ring-black/5">
                  <div
                    className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                    style={{ width: `${tetherPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-gray-500 tabular-nums min-w-[24px] text-right">
                  {tetherPct.toFixed(0)}%
                </span>
              </>
            )}
          </div>

          {/* Healing indicator */}
          {playersTouching && !tetherBroken && (
            <span className="text-[9px] text-green-500 animate-pulse font-bold text-center">
              hồi máu
            </span>
          )}
        </div>

        {/* CENTER: Wave + Timer + Level */}
        <div className="frosted-glass rounded-xl px-3 py-1.5 pointer-events-auto shadow-sm flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="material-icons-round text-gray-400 text-xs">waves</span>
            <span className="text-xs font-black text-gray-800 tabular-nums">{waveNumber}</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-xs font-bold text-gray-500 tabular-nums">
            {formatTime(elapsedTime)}
          </span>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-[var(--color-primary)]">Lv{level}</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-[10px] text-gray-400">
            {diff.icon} {diff.name}
          </span>
        </div>

        {/* RIGHT: Ammo + Coins compact */}
        <div className="frosted-glass rounded-xl px-3 py-2 pointer-events-auto shadow-sm flex items-center gap-3">
          {/* Ammo */}
          <div className="flex items-center gap-1.5">
            <span className="material-icons-round text-amber-500 text-xs">bolt</span>
            <span className="text-sm font-black text-gray-800 tabular-nums">{kittyAmmo}</span>
            <span className="text-[10px] text-gray-300">/10</span>
          </div>

          <div className="w-px h-4 bg-gray-200" />

          {/* Coins */}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center text-yellow-800 text-[8px] font-bold border border-yellow-300">
              $
            </div>
            <span className="text-sm font-bold text-gray-800 tabular-nums">{coins}</span>
          </div>
        </div>
      </div>

      {/* BOTTOM: Pause + Settings buttons */}
      <div className="flex justify-between items-end w-full pb-2">
        {/* Pause button */}
        <button
          onClick={() => setGameState('paused')}
          className="frosted-glass p-2.5 rounded-full text-gray-600 hover:text-[var(--color-primary)] hover:scale-110 transition-all shadow-sm pointer-events-auto"
        >
          <span className="material-icons-round text-lg">pause</span>
        </button>

        {/* Settings button */}
        <button
          onClick={() => setShowCustomize(true)}
          className="frosted-glass p-2.5 rounded-full text-gray-600 hover:text-[var(--color-primary)] hover:scale-110 transition-all shadow-sm group pointer-events-auto"
        >
          <span className="material-icons-round group-hover:rotate-90 transition-transform duration-500 text-lg">
            settings
          </span>
        </button>
      </div>
    </div>
  );
}
