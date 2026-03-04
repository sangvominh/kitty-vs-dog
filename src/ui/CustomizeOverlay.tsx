/**
 * CustomizeOverlay — full-screen frosted-glass overlay for sprite customization.
 * Tabs: Kitty, Doggo, Boss, Phông nền, Cài đặt.
 * Boss tab includes level management (add/remove).
 */

import { useState } from 'react';
import { SpriteSlotPanel } from './SpriteSlotPanel';
import { BackgroundPicker } from './BackgroundPicker';
import { useSpriteStore } from '../game/state/spriteStore';
import { useSettingsStore } from '../lib/settingsStore';
import { createEmptySpriteConfig } from '../game/state/spriteTypes';
import type { EntityId, DataSource } from '../game/state/spriteTypes';
import { saveConfig as saveConfigToDB } from '../lib/spriteStorage';

interface CustomizeOverlayProps {
  onClose: () => void;
}

type TabId = EntityId | 'background' | 'settings';

interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'kitty', label: 'Kitty (P1)', icon: 'pets' },
  { id: 'doggo', label: 'Doggo (P2)', icon: 'cruelty_free' },
  { id: 'boss', label: 'Boss', icon: 'skull' },
  { id: 'background', label: 'Phông nền', icon: 'landscape' },
  { id: 'settings', label: 'Cài đặt', icon: 'settings' },
];

function DataSourceSettings() {
  const dataSource = useSettingsStore((s) => s.dataSource);
  const setDataSource = useSettingsStore((s) => s.setDataSource);

  const options: { id: DataSource; label: string; desc: string; icon: string }[] = [
    {
      id: 'cache',
      label: 'Bộ nhớ trình duyệt',
      desc: 'Lưu ảnh vào IndexedDB (cache). Dữ liệu nằm trong trình duyệt.',
      icon: 'storage',
    },
    {
      id: 'local',
      label: 'Thư mục local-data',
      desc: 'Đọc ảnh từ thư mục local-data/ với manifest.json. Quản lý file thủ công.',
      icon: 'folder_open',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Nguồn dữ liệu sprite</h3>
        <p className="text-sm text-slate-500">Chọn nơi lưu trữ và đọc ảnh sprite tùy chỉnh.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((opt) => {
          const isActive = dataSource === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setDataSource(opt.id)}
              className={`text-left p-5 rounded-xl border-2 transition-all ${
                isActive
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg shadow-[var(--color-primary)]/10'
                  : 'border-white/60 hover:border-slate-300 bg-white/30 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`material-icons-round text-2xl ${isActive ? 'text-[var(--color-primary)]' : 'text-slate-400'}`}
                >
                  {opt.icon}
                </span>
                <span
                  className={`font-bold ${isActive ? 'text-[var(--color-primary)]' : 'text-slate-700'}`}
                >
                  {opt.label}
                </span>
                {isActive && (
                  <span className="ml-auto material-icons-round text-[var(--color-primary)] text-xl">
                    check_circle
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
            </button>
          );
        })}
      </div>

      {dataSource === 'local' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-icons-round text-amber-500 text-xl mt-0.5">info</span>
          <div className="text-sm text-amber-800 leading-relaxed">
            <strong>Cấu trúc thư mục:</strong> Đặt file{' '}
            <code className="bg-amber-100 px-1 rounded">manifest.json</code> vào{' '}
            <code className="bg-amber-100 px-1 rounded">local-data/</code> cùng thư mục{' '}
            <code className="bg-amber-100 px-1 rounded">sprites/</code>. Xem{' '}
            <code className="bg-amber-100 px-1 rounded">local-data/README.md</code> để biết chi
            tiết.
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomizeOverlay({ onClose }: CustomizeOverlayProps) {
  const [activeTab, setActiveTab] = useState<TabId>('kitty');
  const isLoaded = useSpriteStore((s) => s.isLoaded);
  const errorMessage = useSpriteStore((s) => s.errorMessage);

  const handleResetDefaults = async () => {
    if (!window.confirm('Khôi phục tất cả sprite về mặc định? Hành động này không thể hoàn tác.'))
      return;
    const fresh = createEmptySpriteConfig();
    useSpriteStore.setState({ config: fresh, errorMessage: null });
    await saveConfigToDB(fresh);
  };

  if (!isLoaded) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          backgroundImage:
            'radial-gradient(at 0% 0%, hsla(210, 89%, 66%, 0.3) 0px, transparent 50%), radial-gradient(at 100% 0%, hsla(280, 74%, 68%, 0.3) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(180, 65%, 60%, 0.3) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(340, 79%, 74%, 0.3) 0px, transparent 50%)',
          backgroundColor: 'var(--color-bg-light)',
        }}
      >
        <div className="frosted-glass rounded-2xl px-8 py-6 text-slate-600 text-xl font-bold flex items-center gap-3">
          <span className="material-icons-round animate-spin text-[var(--color-primary)]">
            sync
          </span>
          Đang tải cấu hình...
        </div>
      </div>
    );
  }

  const activeTabConfig = TABS.find((t) => t.id === activeTab)!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8"
      style={{
        backgroundImage:
          'radial-gradient(at 0% 0%, hsla(210, 89%, 66%, 0.3) 0px, transparent 50%), radial-gradient(at 100% 0%, hsla(280, 74%, 68%, 0.3) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(180, 65%, 60%, 0.3) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(340, 79%, 74%, 0.3) 0px, transparent 50%)',
        backgroundColor: 'var(--color-bg-light)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay Container */}
      <div className="frosted-glass w-full h-full max-w-[1200px] rounded-xl relative flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <header className="flex-shrink-0 px-6 py-3 flex items-center justify-between border-b border-white/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
              <span className="material-icons-round text-xl">palette</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                Tùy chỉnh Trang phục
              </h1>
              <p className="text-xs text-slate-500 font-medium">Kitty vs MSmini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/50 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
          >
            <span className="material-icons-round text-lg">close</span>
          </button>
        </header>

        {/* Main Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation */}
          <nav className="w-16 lg:w-52 flex-shrink-0 border-r border-white/50 bg-white/20 flex flex-col py-3 px-2 lg:px-4 gap-1 overflow-y-auto scrollbar-hide">
            <div className="hidden lg:block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3">
              Danh mục
            </div>

            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center gap-3 p-2 lg:px-3 lg:py-2.5 rounded-full transition-all
                    ${
                      isActive
                        ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                        : 'hover:bg-white/60 text-slate-600'
                    }
                  `}
                >
                  <span
                    className={`material-icons-round text-lg ${isActive ? '' : 'text-slate-400 group-hover:text-[var(--color-primary)]'}`}
                  >
                    {tab.icon}
                  </span>
                  <span
                    className={`hidden lg:block text-sm ${isActive ? 'font-bold' : 'font-semibold'}`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}

            {/* Pro Tip */}
            <div className="mt-auto pt-4 border-t border-white/30 hidden lg:block">
              <div className="bg-[var(--color-primary)]/10 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[var(--color-primary)] font-bold text-xs mb-0.5">
                  <span className="material-icons-round text-xs">tips_and_updates</span>
                  Mẹo hay
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Dùng ảnh PNG trong suốt, dưới 512px.
                </p>
              </div>
            </div>
          </nav>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 relative bg-white/10">
            {/* Section Header */}
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 mb-0.5">
                  {activeTabConfig.label}
                </h2>
                <p className="text-sm text-slate-500">
                  {activeTab === 'background'
                    ? 'Chọn phông nền cho trận đấu'
                    : activeTab === 'settings'
                      ? 'Cấu hình nguồn dữ liệu và tùy chọn'
                      : `Quản lý hình ảnh hành động của ${activeTabConfig.label}`}
                </p>
              </div>
            </div>

            {/* Tab content */}
            {activeTab === 'background' ? (
              <BackgroundPicker />
            ) : activeTab === 'settings' ? (
              <DataSourceSettings />
            ) : (
              <SpriteSlotPanel entityId={activeTab as EntityId} />
            )}

            {/* Spacer for Footer */}
            <div className="h-16" />
          </main>
        </div>

        {/* Global error */}
        {errorMessage && (
          <div className="px-8 py-2 bg-red-50 border-t border-red-200">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        {/* Sticky Footer Action Bar */}
        <footer className="absolute bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-white/50 px-6 py-3 flex items-center justify-between z-10">
          <button
            onClick={handleResetDefaults}
            className="text-slate-500 hover:text-slate-700 font-semibold text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <span className="material-icons-round text-base">restart_alt</span>
            Khôi phục mặc định
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Tự động lưu
            </span>
            <button
              onClick={onClose}
              className="bg-[var(--color-primary)] hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full shadow-md shadow-[var(--color-primary)]/30 flex items-center gap-2 text-sm transition-all transform active:scale-95"
            >
              <span className="material-icons-round text-lg">check</span>
              Xong
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
