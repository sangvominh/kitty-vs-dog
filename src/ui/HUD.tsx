import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../lib/settingsStore';
import { getDifficulty } from '../game/state/difficultyConfig';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function HUD() {
  const health = useGameStore((s) => s.health);
  const maxHealth = useGameStore((s) => s.maxHealth);
  const kittyAmmo = useGameStore((s) => s.kittyAmmo);
  const doggoStamina = useGameStore((s) => s.doggoStamina);
  const elapsedTime = useGameStore((s) => s.elapsedTime);
  const waveNumber = useGameStore((s) => s.waveNumber);
  const coins = useGameStore((s) => s.coins);
  const level = useGameStore((s) => s.level);
  const nextLevelThreshold = useGameStore((s) => s.nextLevelThreshold);
  const tetherDurability = useGameStore((s) => s.tetherDurability);
  const maxTetherDurability = useGameStore((s) => s.maxTetherDurability);
  const tetherBroken = useGameStore((s) => s.tetherBroken);
  const playersTouching = useGameStore((s) => s.playersTouching);
  const difficultyId = useSettingsStore((s) => s.difficultyId);
  const diff = getDifficulty(difficultyId);

  const healthPct = maxHealth > 0 ? health / maxHealth : 0;
  const healthColor = healthPct > 0.6 ? '#4ade80' : healthPct > 0.3 ? '#facc15' : '#f87171';

  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-3">
      <div className="flex justify-between items-start">
        {/* Left */}
        <div className="flex flex-col gap-1.5 bg-black/30 backdrop-blur-md rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/50 w-6">HP</span>
            <Bar value={health} max={maxHealth} color={healthColor} />
            <span className="text-[11px] text-white/50 font-mono">{health}</span>
            {playersTouching && !tetherBroken && (
              <span className="text-[10px] text-white/40 animate-pulse">healing</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/50 w-6">🔗</span>
            {tetherBroken ? (
              <span className="text-[10px] text-red-400/80">broken</span>
            ) : (
              <>
                <Bar value={tetherDurability} max={maxTetherDurability} color="#f9a8d4" />
                <span className="text-[11px] text-white/40 font-mono">{tetherDurability}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <span>W{waveNumber}</span>
            <span className="text-white/20">·</span>
            <span>
              {diff.icon} {diff.name}
            </span>
          </div>
        </div>

        {/* Center */}
        <div className="flex flex-col items-center bg-black/30 backdrop-blur-md rounded-xl px-4 py-2">
          <span className="text-white/80 text-lg font-mono font-medium tracking-wide">
            {formatTime(elapsedTime)}
          </span>
          {playersTouching && !tetherBroken && (
            <span className="text-[10px] text-white/30">ATK -60%</span>
          )}
        </div>

        {/* Right */}
        <div className="flex flex-col gap-1.5 items-end bg-black/30 backdrop-blur-md rounded-xl px-3 py-2">
          <div className="flex items-center gap-3 text-[12px]">
            <span className="text-white/50">
              🐱 <span className="font-mono text-white/70">{kittyAmmo}</span>
            </span>
            <span className="text-white/50">
              🐶 <span className="font-mono text-white/70">{doggoStamina}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-white/50 font-mono">{coins} coins</span>
            <span className="text-white/20">·</span>
            <span className="text-white/50">Lv.{level}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bar value={coins} max={nextLevelThreshold} color="#a78bfa" />
            <span className="text-[10px] text-white/30 font-mono">
              {coins}/{nextLevelThreshold}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
