import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type AgentRole = 'DIRECTOR' | 'WRITER' | 'VISUALIZER' | 'AUDIO' | 'HUMAN' | 'SYSTEM';

export interface Message {
  id: string;
  role: AgentRole;
  content: string;
  timestamp: number;
  metadata?: any; // For storing image urls, tags, or scene specific JSON
}

interface AgentStore {
  messages: Message[];
  isGenerating: boolean;
  roomId: string | null;
  avatarId: string | null;
  songVibe: string;
  
  // Actions
  setSongVibe: (vibe: string) => void;
  setRoomId: (id: string) => void;
  setAvatarId: (id: string) => void;
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  humanOverride: (content: string) => void;
  rollback: (count?: number) => void; // Removes the last N messages
  setGenerating: (status: boolean) => void;
  clearAll: () => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  messages: [],
  isGenerating: false,
  roomId: null,
  avatarId: null,
  songVibe: 'Cyberpunk Neon',

  setSongVibe: (vibe) => set({ songVibe: vibe }),
  setRoomId: (id) => set({ roomId: id }),
  setAvatarId: (id) => set({ avatarId: id }),

  addMessage: (msg) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...msg,
        id: uuidv4(),
        timestamp: Date.now(),
      }
    ]
  })),

  humanOverride: (content) => set((state) => ({
    messages: [
      ...state.messages,
      {
        id: uuidv4(),
        role: 'HUMAN',
        content,
        timestamp: Date.now(),
      }
    ]
  })),

  // Rollback to break consensus loop and let user intervene
  rollback: (count = 2) => set((state) => {
    const newMessages = [...state.messages];
    if (newMessages.length > count) {
      newMessages.splice(-count, count); // remove the last 'count' items
    } else {
      newMessages.length = 0; // clear all if rollback is more than we have
    }
    return { messages: newMessages };
  }),

  setGenerating: (status) => set({ isGenerating: status }),
  
  clearAll: () => set({ messages: [] })
}));
