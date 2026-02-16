import { DIFFICULTY_LEVELS, type DifficultyId } from '../game/state/difficultyConfig';
import { useSettingsStore } from '../lib/settingsStore';

interface DifficultySelectProps {
  onPlay: () => void;
  onCustomize: () => void;
}

export function DifficultySelect({ onPlay, onCustomize }: DifficultySelectProps) {
  const difficultyId = useSettingsStore((s) => s.difficultyId);
  const setDifficulty = useSettingsStore((s) => s.setDifficulty);
  const settings = useSettingsStore((s) => s.settings);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0a0f]">
      {/* Title */}
      <h1 className="text-3xl font-semibold text-white/90 tracking-tight mb-1">Kitty vs MSmini</h1>
      <p className="text-[13px] text-white/40 mb-8">Chọn độ khó</p>

      {/* Difficulty list */}
      <div className="w-[420px] rounded-2xl bg-white/[0.06] backdrop-blur-xl overflow-hidden mb-6">
        {DIFFICULTY_LEVELS.map((d, i) => {
          const isSelected = d.id === difficultyId;
          const bestWave = settings?.bestWaves[d.id];
          const isLast = i === DIFFICULTY_LEVELS.length - 1;
          return (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id as DifficultyId)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                ${!isLast ? 'border-b border-white/[0.06]' : ''}
                ${isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}
              `}
            >
              <span className="text-xl w-8 text-center shrink-0">{d.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[14px] font-medium ${isSelected ? 'text-white' : 'text-white/70'}`}
                  >
                    {d.name}
                  </span>
                  {bestWave !== undefined && (
                    <span className="text-[11px] text-white/30">Wave {bestWave}</span>
                  )}
                </div>
                <span className="text-[12px] text-white/30">{d.description}</span>
              </div>
              {isSelected && (
                <svg
                  className="w-5 h-5 text-white/60 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      {settings && settings.gamesPlayed > 0 && (
        <p className="text-[12px] text-white/25 mb-6">{settings.gamesPlayed} trận đã chơi</p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-[420px]">
        <button
          onClick={onPlay}
          className="w-full py-3.5 rounded-2xl bg-white/90 text-[#0a0a0f] text-[15px] font-semibold tracking-tight transition-all hover:bg-white active:scale-[0.98]"
        >
          Bắt Đầu
        </button>
        <button
          onClick={onCustomize}
          className="w-full py-3 rounded-2xl bg-white/[0.06] text-white/60 text-[14px] font-medium transition-all hover:bg-white/[0.1] active:scale-[0.98]"
        >
          Tùy chỉnh sprite
        </button>
      </div>
    </div>
  );
}
