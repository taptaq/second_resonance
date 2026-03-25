import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export type AgentRole = 'DIRECTOR' | 'WRITER' | 'VISUALIZER' | 'AUDIO' | 'HUMAN' | 'SYSTEM';
export type PlayState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'CHECKPOINT' | 'COMPLETED';

export interface Message {
  id: string;
  role: AgentRole;
  content: string;
  timestamp: number;
  metadata?: any; // For storing image urls, tags, or scene specific JSON
}

interface AgentStore {
  messages: Message[];
  chatMessages: Message[];
  lastReadChatCount: number;
  isChatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  isGenerating: boolean;
  playState: PlayState;
  roomId: string | null;
  avatarId: string | null;
  songVibe: string;
  roomInfo: any | null;
  songInfo: any | null;
  secondMeUser: any | null;
  
  // Actions
  setSecondMeUser: (user: any) => void;
  setSongVibe: (vibe: string) => void;
  setRoomId: (id: string) => void;
  setAvatarId: (id: string) => void;
  setRoomInfo: (info: any) => void;
  setSongInfo: (info: any) => void;
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  setMessages: (dbMsgs: any[]) => void;
  humanOverride: (content: string) => void;
  rollback: (count?: number) => void; // Removes the last N messages
  setGenerating: (status: boolean) => void;
  setPlayState: (state: PlayState) => void;
  clearAll: () => void;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set) => ({
      messages: [],
  chatMessages: [],
  lastReadChatCount: 0,
  isChatOpen: false,
  setChatOpen: (v) => set((state) => ({ 
    isChatOpen: v, 
    lastReadChatCount: v ? state.chatMessages.length : state.lastReadChatCount 
  })),
  isGenerating: false,
  playState: 'IDLE',
  roomId: null,
  avatarId: null,
  songVibe: 'Cyberpunk Neon',
  roomInfo: null,
  songInfo: null,
  secondMeUser: null,

  setSecondMeUser: (user) => set({ secondMeUser: user }),

  setSongVibe: (vibe) => set({ songVibe: vibe }),
  setRoomId: (id) => set({ roomId: id }),
  setAvatarId: (id) => set({ avatarId: id }),
  setRoomInfo: (info) => set({ roomInfo: info }),
  setSongInfo: (info) => set({ songInfo: info }),

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

  setMessages: (dbMsgs) => set((state) => {
    if (!dbMsgs) return state;
    
    const parsed = dbMsgs.map((m: any) => ({
      id: m.id,
      role: m.agentRole,
      content: m.content,
      timestamp: new Date(m.createdAt).getTime(),
      metadata: m.metadata
    }));

    const story = parsed.filter((m: any) => m.role !== 'CHAT');
    const bchat = parsed.filter((m: any) => m.role === 'CHAT');

    let nextState: Partial<AgentStore> = {};
    
    const isLocalPolluted = state.messages.some((m: any) => m.role === 'CHAT');
    const isSignificantWipe = story.length === 0 && state.messages.length > 0;
    
    if (story.length > state.messages.length || isSignificantWipe || isLocalPolluted) {
      nextState.messages = story;
    }
    
    if (bchat.length > state.chatMessages.length) {
      nextState.chatMessages = bchat;
      if (state.isChatOpen) {
        nextState.lastReadChatCount = bchat.length;
      }
    }

    return Object.keys(nextState).length > 0 ? nextState : state;
  }),

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
  setPlayState: (newState) => set({ playState: newState }),
  
  clearAll: () => set({ messages: [], playState: 'IDLE' })
    }),
    {
      name: 'second-resonance-agent-store',
      // Optionally configure partialization if we don't want to save heavy messages to local storage permanently
      partialize: (state) => ({ 
        avatarId: state.avatarId,
        songVibe: state.songVibe,
        roomInfo: state.roomInfo,
        songInfo: state.songInfo,
        secondMeUser: state.secondMeUser
      })
    }
  )
);
