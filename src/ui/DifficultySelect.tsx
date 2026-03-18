import { DIFFICULTY_LEVELS, type DifficultyId } from '../game/state/difficultyConfig';
import { useSettingsStore } from '../lib/settingsStore';

interface DifficultySelectProps {
  onPlay: () => void;
  onCustomize: () => void;
}

/** Mô tả ngắn cho từng chế độ */
const SUBTITLE: Record<string, string> = {
  thu: 'Dành cho người mới',
  'binh-thuong': 'Trải nghiệm chuẩn',
  'gan-ket': 'Phối hợp đồng đội',
  plus: 'Thử thách bắt đầu',
  pro: 'Dành cho cao thủ',
  promax: 'Gần như bất khả',
  'ac-quy': 'Không lối thoát',
};

export function DifficultySelect({ onPlay, onCustomize }: DifficultySelectProps) {
  const difficultyId = useSettingsStore((s) => s.difficultyId);
  const setDifficulty = useSettingsStore((s) => s.setDifficulty);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between bg-[var(--color-bg-light)] overflow-hidden selection:bg-[var(--color-primary)] selection:text-white">
      {/* Background decorative elements */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-light)]/90 via-[var(--color-bg-light)]/60 to-transparent z-10" />
      </div>
      <div className="absolute top-10 left-10 w-32 h-32 bg-[var(--color-primary)]/20 rounded-full blur-3xl animate-pulse z-0" />
      <div
        className="absolute bottom-20 right-20 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl animate-pulse z-0"
        style={{ animationDelay: '1s' }}
      />

      {/* Main Content */}
      <main className="relative z-20 h-full flex flex-col items-center py-8 px-6 lg:py-12 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Header / Top Bar */}
        <header className="w-full flex justify-between items-start">
          <span className="text-sm font-bold tracking-wider text-[var(--color-primary)] uppercase bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/50 shadow-sm">
            v1.0.0 Truy cập sớm
          </span>
          <div className="flex gap-3">
            <button
              aria-label="Âm thanh"
              title="Âm thanh"
              className="w-10 h-10 flex items-center justify-center rounded-full glass-card text-slate-600 hover:text-[var(--color-primary)] transition-colors text-xl"
            >
              <span className="material-icons-round">volume_up</span>
            </button>
            <button
              aria-label="Cài đặt"
              title="Cài đặt"
              className="w-10 h-10 flex items-center justify-center rounded-full glass-card text-slate-600 hover:text-[var(--color-primary)] transition-colors text-xl"
            >
              <span className="material-icons-round">settings</span>
            </button>
          </div>
        </header>

        {/* Center Logo / Title */}
        <div className="text-center flex-1 flex flex-col justify-center items-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[var(--color-primary)] via-blue-400 to-purple-500 drop-shadow-sm mb-2 leading-tight">
            Dây Tơ Hồng
          </h1>
          <h2 className="text-lg md:text-xl font-bold text-slate-500 tracking-widest uppercase mb-2">
            Kitty~Pet
          </h2>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-700 tracking-tight">
            {/* Kitty vs MSmini */}
          </h2>
        </div>

        {/* Difficulty Selection */}
        <div className="w-full max-w-6xl mb-6">
          <div className="flex items-center justify-between mb-5 px-2">
            <div className="flex items-center gap-2">
              <span className="material-icons-round text-[var(--color-primary)] text-xl">
                signal_cellular_alt
              </span>
              <h3 className="text-xl font-bold text-slate-700">Chọn Độ Khó</h3>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4 w-full">
            {DIFFICULTY_LEVELS.map((d) => {
              const isSelected = d.id === difficultyId;
              const isInferno = d.id === 'ac-quy';

              return (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id as DifficultyId)}
                  className={`group flex flex-col items-center justify-center p-4 rounded-lg md:rounded-xl relative text-center h-36 md:h-44 transition-all cursor-pointer
                    ${
                      isSelected
                        ? 'glass-card active transform scale-105 z-10'
                        : isInferno
                          ? 'glass-card border-red-200 hover:border-red-400 hover:bg-red-50/50'
                          : 'glass-card'
                    }
                    ${d.id === 'promax' ? 'opacity-75 hover:opacity-100' : ''}
                  `}
                >
                  {isSelected && (
                    <div className="absolute -top-3 bg-[var(--color-primary)] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg z-10">
                      ĐÃ CHỌN
                    </div>
                  )}
                  <div
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mb-3 text-2xl md:text-3xl shadow-inner group-hover:scale-110 transition-transform
                      ${isInferno ? 'bg-gradient-to-br from-red-500 to-slate-800 text-white shadow-lg' : ''}
                    `}
                    style={
                      !isInferno ? { backgroundColor: `${d.color}20`, color: d.color } : undefined
                    }
                  >
                    {d.icon}
                  </div>
                  <span
                    className={`font-bold text-sm md:text-base ${isInferno ? 'text-red-600' : 'text-slate-800'}`}
                  >
                    {d.name}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">{SUBTITLE[d.id] ?? ''}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="w-full max-w-lg flex flex-col-reverse md:flex-row gap-4 items-center justify-center pb-4">
          <button
            onClick={onCustomize}
            className="w-full md:w-auto px-8 py-4 rounded-full glass-panel hover:bg-white/80 font-bold text-slate-600 transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200/60 shadow-sm"
          >
            <span className="material-icons-round text-[var(--color-primary)]/70 text-xl">
              checkroom
            </span>
            Tùy chỉnh Sprite
          </button>
          <button
            onClick={onPlay}
            className="w-full md:w-auto flex-1 px-8 py-4 rounded-full bg-[var(--color-primary)] hover:bg-blue-600 text-white font-extrabold text-lg shadow-[0_10px_20px_-5px_rgba(43,140,238,0.4)] hover:shadow-[0_15px_25px_-5px_rgba(43,140,238,0.5)] transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-icons-round text-2xl">play_arrow</span>
            Bắt Đầu
          </button>
        </div>
      </main>

      {/* Character Preview Decorations */}
      <div className="hidden lg:block absolute bottom-8 left-12 z-10 pointer-events-none opacity-80">
        <div className="bg-white/30 backdrop-blur-md p-2 rounded-2xl border border-white/40 shadow-lg transform -rotate-3">
          <div className="w-24 h-24 bg-gradient-to-br from-pink-200 to-purple-200 rounded-xl flex items-center justify-center">
            <span className="text-4xl">🐱</span>
          </div>
          <div className="mt-2 text-center text-xs font-bold text-slate-600">P1: Kitty</div>
        </div>
      </div>
      <div className="hidden lg:block absolute bottom-16 right-12 z-10 pointer-events-none opacity-80">
        <div className="bg-white/30 backdrop-blur-md p-2 rounded-2xl border border-white/40 shadow-lg transform rotate-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-xl flex items-center justify-center">
            <span className="text-4xl">🤖</span>
          </div>
          <div className="mt-2 text-center text-xs font-bold text-slate-600">P2: MSmini</div>
        </div>
      </div>
    </div>
  );
}
