import { create } from 'zustand';

interface UnreadState {
  count: number;
  lastSender: string;
  lastContent: string;
  hasNew: boolean;
  setCount: (n: number) => void;
  setLastMessage: (sender: string, content: string) => void;
  clearNewFlag: () => void;
  decrement: () => void;
}

export const useUnreadStore = create<UnreadState>((set) => ({
  count: 0,
  lastSender: '',
  lastContent: '',
  hasNew: false,
  setCount: (n: number) => set({ count: n }),
  setLastMessage: (sender: string, content: string) => set({ lastSender: sender, lastContent: content, hasNew: true }),
  clearNewFlag: () => set({ hasNew: false }),
  decrement: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));
