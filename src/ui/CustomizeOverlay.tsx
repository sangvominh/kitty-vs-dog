/**
 * CustomizeOverlay — full-screen overlay for sprite customization.
 * Renders tabs for all 5 entity types with SpriteSlotPanel components.
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
  emoji: string;
}

const TABS: TabConfig[] = [
  { id: 'background', label: 'Phong Cảnh', emoji: '🖼️' },
  { id: 'kitty', label: 'Kitty', emoji: '🐱' },
  { id: 'doggo', label: 'Doggo', emoji: '🐶' },
  { id: 'enemy-bill', label: 'Bill', emoji: '📄' },
  { id: 'enemy-deadline', label: 'Deadline', emoji: '⏰' },
  { id: 'enemy-ex-lover', label: 'Ex-Lover', emoji: '💔' },
];

export function CustomizeOverlay({ onClose }: CustomizeOverlayProps) {
  const [activeTab, setActiveTab] = useState<TabId>('background');
  const isLoaded = useSpriteStore((s) => s.isLoaded);
  const errorMessage = useSpriteStore((s) => s.errorMessage);

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="text-white text-xl">Loading sprite configuration...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-gray-600">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-600">
          <h2 className="text-xl font-bold text-white">Customize Sprites</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
            title="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-600 px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }
              `}
            >
              <span className="mr-1">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'background' ? (
            <BackgroundPicker />
          ) : (
            <SpriteSlotPanel
              entityId={activeTab as EntityId}
              label={TABS.find((t) => t.id === activeTab)!.label}
            />
          )}
        </div>

        {/* Global error */}
        {errorMessage && (
          <div className="px-6 py-2 bg-red-900/30 border-t border-red-800">
            <p className="text-sm text-red-400">{errorMessage}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-600">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-500 rounded hover:border-gray-400 transition-colors"
          >
            Back
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-500 rounded transition-colors"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}
