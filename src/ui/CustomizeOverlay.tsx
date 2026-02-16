/**
 * CustomizeOverlay — full-screen frosted-glass overlay for sprite customization.
 * Sidebar navigation + sprite grid + background picker following stitch design.
 */

import { useState } from 'react';
import { SpriteSlotPanel } from './SpriteSlotPanel';
import { BackgroundPicker } from './BackgroundPicker';
import { useSpriteStore } from '../game/state/spriteStore';
import type { EntityId } from '../game/state/spriteTypes';

interface CustomizeOverlayProps {
  onClose: () => void;
}

type TabId = EntityId | 'background';

interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'kitty', label: 'Kitty (P1)', icon: 'pets' },
  { id: 'background', label: 'Phông nền', icon: 'landscape' },
  { id: 'doggo', label: 'Doggo (P2)', icon: 'cruelty_free' },
  { id: 'enemy-bill', label: 'Hóa đơn', icon: 'receipt_long' },
  { id: 'enemy-deadline', label: 'Deadline', icon: 'timer' },
  { id: 'enemy-ex-lover', label: 'Người yêu cũ', icon: 'broken_heart' },
];

export function CustomizeOverlay({ onClose }: CustomizeOverlayProps) {
  const [activeTab, setActiveTab] = useState<TabId>('kitty');
  const isLoaded = useSpriteStore((s) => s.isLoaded);
  const errorMessage = useSpriteStore((s) => s.errorMessage);

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
      <div className="frosted-glass w-full h-full max-w-[1400px] rounded-xl relative flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <header className="flex-shrink-0 px-8 py-6 flex items-center justify-between border-b border-white/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
              <span className="material-icons-round text-3xl">palette</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Tùy chỉnh Trang phục</h1>
              <p className="text-sm text-slate-500 font-medium">Kitty vs MSmini</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/50 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
            >
              <span className="material-icons-round text-xl">close</span>
            </button>
          </div>
        </header>

        {/* Main Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation */}
          <nav className="w-20 lg:w-64 flex-shrink-0 border-r border-white/50 bg-white/20 flex flex-col py-6 px-3 lg:px-6 gap-2 overflow-y-auto scrollbar-hide">
            <div className="hidden lg:block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-4">
              Danh mục
            </div>

            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center gap-4 p-3 lg:px-4 lg:py-3.5 rounded-full transition-all
                    ${
                      isActive
                        ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.02]'
                        : 'hover:bg-white/60 text-slate-600'
                    }
                  `}
                >
                  <span
                    className={`material-icons-round text-xl ${isActive ? '' : 'text-slate-400 group-hover:text-[var(--color-primary)]'}`}
                  >
                    {tab.icon}
                  </span>
                  <span className={`hidden lg:block ${isActive ? 'font-bold' : 'font-semibold'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}

            {/* Pro Tip */}
            <div className="mt-auto pt-6 border-t border-white/30 hidden lg:block">
              <div className="bg-[var(--color-primary)]/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm mb-1">
                  <span className="material-icons-round text-sm">tips_and_updates</span>
                  Mẹo hay
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dùng ảnh PNG trong suốt để đạt kết quả tốt nhất. Kích thước dưới 512px.
                </p>
              </div>
            </div>
          </nav>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-10 relative bg-white/10">
            {/* Section Header */}
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
                  {activeTabConfig.label}
                </h2>
                <p className="text-slate-500">
                  {activeTab === 'background'
                    ? 'Chọn phông nền cho trận đấu'
                    : `Quản lý hình ảnh của ${activeTabConfig.label}`}
                </p>
              </div>
            </div>

            {/* Tab content */}
            {activeTab === 'background' ? (
              <BackgroundPicker />
            ) : (
              <SpriteSlotPanel entityId={activeTab as EntityId} label={activeTabConfig.label} />
            )}

            {/* Spacer for Footer */}
            <div className="h-24" />
          </main>
        </div>

        {/* Global error */}
        {errorMessage && (
          <div className="px-8 py-2 bg-red-50 border-t border-red-200">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        {/* Sticky Footer Action Bar */}
        <footer className="absolute bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-white/50 px-8 py-4 flex items-center justify-between z-10">
          <button className="text-slate-500 hover:text-slate-700 font-semibold text-sm flex items-center gap-2 px-4 py-2 rounded-full hover:bg-slate-100 transition-colors">
            <span className="material-icons-round text-lg">restart_alt</span>
            Khôi phục mặc định
          </button>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 font-medium hidden sm:block">
              Thay đổi được tự động lưu.
            </span>
            <button
              onClick={onClose}
              className="bg-[var(--color-primary)] hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-[var(--color-primary)]/30 flex items-center gap-2 transition-all transform active:scale-95"
            >
              <span className="material-icons-round text-xl">save</span>
              Áp dụng & Lưu
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
