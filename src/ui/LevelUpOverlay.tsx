import { useGameStore, type UpgradeType } from '../game/state/gameStore';

const UPGRADES: {
  type: UpgradeType;
  label: string;
  description: string;
  key: string;
}[] = [
  { type: 'tether-length', label: 'Dây dài hơn', description: '+50px', key: '1' },
  { type: 'damage', label: 'Sát thương', description: 'ATK +5', key: '2' },
  { type: 'speed', label: 'Tốc độ', description: '+0.5', key: '3' },
  { type: 'ammo', label: 'Đạn', description: '+2 & nạp đầy', key: '4' },
  { type: 'attack-speed', label: 'Tốc bắn', description: '-100ms CD', key: '5' },
];

const PLAYER_NAMES: Record<string, string> = {
  kitty: 'Kitty 🐱',
  doggo: 'Doggo 🐶',
};

export function LevelUpOverlay() {
  const setSelectedUpgrade = useGameStore((s) => s.setSelectedUpgrade);
  const level = useGameStore((s) => s.level);
  const upgradingPlayer = useGameStore((s) => s.upgradingPlayer);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="w-[440px] bg-white/[0.06] backdrop-blur-xl rounded-3xl p-6">
        <h2 className="text-xl font-semibold text-white/90 text-center mb-1">Level {level}</h2>
        {upgradingPlayer && (
          <p className="text-[13px] text-white/40 text-center mb-4">
            {PLAYER_NAMES[upgradingPlayer]} nâng cấp
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          {UPGRADES.map((u) => (
            <button
              key={u.type}
              onClick={() => setSelectedUpgrade(u.type)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-left"
            >
              <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[12px] text-white/50 font-mono shrink-0">
                {u.key}
              </span>
              <div className="flex-1">
                <span className="text-[14px] text-white/80 font-medium">{u.label}</span>
                <span className="text-[12px] text-white/30 ml-2">{u.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
