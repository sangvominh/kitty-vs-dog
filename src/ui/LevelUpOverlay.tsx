import { useGameStore, type UpgradeType } from '../game/state/gameStore';

const UPGRADES: {
  type: UpgradeType;
  label: string;
  description: string;
  key: string;
  icon: string;
  stat: string;
  statValue: string;
  rarity: string;
  rarityColor: string;
  iconColor: string;
  borderColor: string;
}[] = [
  {
    type: 'tether-length',
    label: 'Dây dài hơn',
    description: 'Tăng phạm vi tấn công thêm 15%. Giúp bạn đánh xa hơn.',
    key: '1',
    icon: 'all_inclusive',
    stat: 'Phạm vi',
    statValue: '+15%',
    rarity: 'Thường',
    rarityColor: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    iconColor: 'text-[var(--color-primary)]',
    borderColor: 'border-[var(--color-primary)]/10 group-hover:border-[var(--color-primary)]',
  },
  {
    type: 'damage',
    label: 'Sát thương',
    description: 'Tăng sức mạnh đòn đánh thêm 5 điểm. Tiêu diệt quái nhanh hơn.',
    key: '2',
    icon: 'swords',
    stat: 'Sát thương',
    statValue: '+5',
    rarity: 'Hiếm',
    rarityColor: 'bg-orange-100 text-orange-600',
    iconColor: 'text-orange-500',
    borderColor: 'border-orange-100 group-hover:border-orange-500',
  },
  {
    type: 'speed',
    label: 'Tốc độ',
    description: 'Di chuyển nhanh như gió. Tốc độ tăng thêm 10%.',
    key: '3',
    icon: 'bolt',
    stat: 'Tốc độ',
    statValue: '+10%',
    rarity: 'Thường',
    rarityColor: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    iconColor: 'text-[var(--color-primary)]',
    borderColor: 'border-[var(--color-primary)]/10 group-hover:border-[var(--color-primary)]',
  },
  {
    type: 'ammo',
    label: 'Đạn & Hồi máu',
    description: 'Nạp đầy đạn và hồi phục ngay lập tức 20 HP.',
    key: '4',
    icon: 'shield',
    stat: 'Giáp',
    statValue: '+2',
    rarity: 'Thường',
    rarityColor: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    iconColor: 'text-[var(--color-primary)]',
    borderColor: 'border-[var(--color-primary)]/10 group-hover:border-[var(--color-primary)]',
  },
  {
    type: 'attack-speed',
    label: 'Hồi máu',
    description: 'Hồi phục ngay lập tức 20 HP. Cứu nguy khẩn cấp.',
    key: '5',
    icon: 'favorite',
    stat: 'Hồi máu',
    statValue: '20 HP',
    rarity: 'Hồi phục',
    rarityColor: 'bg-pink-100 text-pink-500',
    iconColor: 'text-pink-500',
    borderColor: 'border-pink-100 group-hover:border-pink-500',
  },
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
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-auto game-bg">
      {/* Blurred overlay */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-[1400px] flex flex-col items-center px-4 md:px-8">
        {/* Title Section */}
        <div className="mb-12 text-center relative">
          <div className="absolute inset-0 bg-[var(--color-primary)]/20 blur-3xl rounded-full scale-150" />
          <h1
            className="relative text-6xl md:text-8xl font-extrabold text-white drop-shadow-[0_4px_4px_rgba(43,140,238,0.8)] tracking-tight uppercase"
            style={{ WebkitTextStroke: '2px #2b8cee' }}
          >
            Lên Cấp!
          </h1>
          <p className="relative mt-2 text-white font-bold text-xl drop-shadow-md">
            {upgradingPlayer
              ? `${PLAYER_NAMES[upgradingPlayer]} — Cấp ${level}`
              : `Cấp ${level} — Chọn một nâng cấp`}
          </p>
        </div>

        {/* Cards Container */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 items-stretch">
          {UPGRADES.map((u) => (
            <div
              key={u.type}
              onClick={() => setSelectedUpgrade(u.type)}
              className="glass-card rounded-lg p-6 flex flex-col items-center text-center relative group cursor-pointer h-full glow-effect ring-4 ring-transparent hover:ring-[var(--color-primary)]/20"
            >
              {/* Rarity Badge */}
              <div
                className={`absolute top-4 right-4 ${u.rarityColor} font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wide`}
              >
                {u.rarity}
              </div>

              {/* Icon Circle */}
              <div
                className={`w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg border-4 ${u.borderColor} group-hover:scale-110 transition-all duration-300`}
              >
                <span className={`material-icons-round text-5xl ${u.iconColor}`}>{u.icon}</span>
              </div>

              {/* Title & Description */}
              <h3
                className={`text-xl font-bold text-slate-800 mb-2 group-hover:${u.iconColor} transition-colors`}
              >
                {u.label}
              </h3>
              <p className="text-slate-500 text-sm mb-6 flex-grow">{u.description}</p>

              {/* Stats & Button */}
              <div className="w-full mt-auto space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-400 bg-white/50 rounded-lg p-2">
                  <span>{u.stat}</span>
                  <span className="text-green-600 text-right">{u.statValue}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUpgrade(u.type);
                  }}
                  className="w-full bg-[var(--color-primary)] text-white font-bold py-3 rounded-full shadow-lg shadow-[var(--color-primary)]/30 hover:shadow-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/90 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Chọn</span>
                  <div className="bg-white/20 px-2 py-0.5 rounded text-xs font-mono">{u.key}</div>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Secondary Actions */}
        <div className="mt-10 flex gap-4">
          <button className="glass-panel px-6 py-3 rounded-full text-slate-600 font-bold text-sm hover:bg-white hover:text-[var(--color-primary)] transition-colors flex items-center gap-2">
            <span className="material-icons-round text-lg">refresh</span>
            Đổi lại
          </button>
          <button className="glass-panel px-6 py-3 rounded-full text-slate-600 font-bold text-sm hover:bg-white hover:text-red-500 transition-colors flex items-center gap-2">
            <span className="material-icons-round text-lg">skip_next</span>
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  );
}
