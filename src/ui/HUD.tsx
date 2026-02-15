import { useGameStore } from '../game/state/gameStore';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function HealthBar({ current, max }: { current: number; max: number }) {
  const percentage = Math.max(0, (current / max) * 100);
  const barColor =
    percentage > 60 ? 'bg-green-500' : percentage > 30 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="w-48 h-4 bg-gray-700 rounded-full overflow-hidden border border-gray-500">
      <div
        className={`h-full ${barColor} transition-all duration-200`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function AmmoDisplay({ label, current, max }: { label: string; current: number; max: number }) {
  const isEmpty = current === 0;
  return (
    <div
      className={`flex items-center gap-1 ${isEmpty ? 'animate-pulse text-red-400' : 'text-white'}`}
    >
      <span>{label}</span>
      <span className="font-mono text-sm">
        {current}/{max}
      </span>
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

  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-4">
      <div className="flex justify-between items-start">
        {/* Left: Health + Wave */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-sm font-bold">HP</span>
            <HealthBar current={health} max={maxHealth} />
            <span className="text-white text-xs">
              {health}/{maxHealth}
            </span>
          </div>
          <span className="text-blue-300 text-sm font-semibold">Wave {waveNumber}</span>
        </div>

        {/* Center: Timer */}
        <div className="text-white text-xl font-mono font-bold">{formatTime(elapsedTime)}</div>

        {/* Right: Ammo + Coins + Level */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-4">
            <AmmoDisplay label="🐱" current={kittyAmmo} max={10} />
            <AmmoDisplay label="🐶" current={doggoStamina} max={8} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 font-bold">🪙 {coins}</span>
            <div className="flex items-center gap-2">
              <span className="text-purple-300 text-sm font-semibold">Lv.{level}</span>
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden border border-gray-500">
                <div
                  className="h-full bg-purple-500 transition-all duration-200"
                  style={{ width: `${Math.min(100, (coins / nextLevelThreshold) * 100)}%` }}
                />
              </div>
              <span className="text-gray-400 text-xs">
                {coins}/{nextLevelThreshold}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
