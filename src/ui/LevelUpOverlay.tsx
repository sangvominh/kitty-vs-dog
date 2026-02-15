import { useGameStore, type UpgradeType } from '../game/state/gameStore';

const UPGRADES: { type: UpgradeType; label: string; description: string; emoji: string }[] = [
  {
    type: 'tether-length',
    label: 'Longer Rope',
    description: 'Max tether distance +50px, rest length +33px',
    emoji: '🔗',
  },
  {
    type: 'damage',
    label: 'More Damage',
    description: 'Attack damage +5, clothesline damage +15',
    emoji: '⚔️',
  },
  {
    type: 'speed',
    label: 'Faster Movement',
    description: 'Movement speed +0.5 for both players',
    emoji: '💨',
  },
];

export function LevelUpOverlay() {
  const setSelectedUpgrade = useGameStore((s) => s.setSelectedUpgrade);
  const level = useGameStore((s) => s.level);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 pointer-events-auto">
      <div className="bg-gray-900/95 rounded-2xl p-8 max-w-2xl w-full mx-4 border border-purple-500/30">
        <h2 className="text-3xl font-bold text-purple-300 text-center mb-2">Level Up!</h2>
        <p className="text-gray-400 text-center mb-6">Level {level} — Choose an upgrade:</p>
        <div className="flex gap-4 justify-center">
          {UPGRADES.map((upgrade) => (
            <button
              key={upgrade.type}
              onClick={() => setSelectedUpgrade(upgrade.type)}
              className="flex-1 bg-gray-800 hover:bg-gray-700 border border-purple-500/40 hover:border-purple-400 rounded-xl p-5 transition-all cursor-pointer group"
            >
              <div className="text-3xl mb-2">{upgrade.emoji}</div>
              <h3 className="text-white font-bold text-lg mb-1 group-hover:text-purple-300">
                {upgrade.label}
              </h3>
              <p className="text-gray-400 text-sm">{upgrade.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
