"use client";

import { create } from "zustand";
import type { ChatMessage, SafeProviderConfig } from "@/lib/types";
import type { ApiFailure } from "@/lib/client/api";

type User = {
  id: string;
  email: string;
  name: string;
};

type WorkspaceState = {
  user: User | null;
  config: SafeProviderConfig | null;
  feature: "image" | "imageToImage" | "video";
  prompt: string;
  imageUrl: string;
  output: string;
  progress: number;
  busy: boolean;
  messages: ChatMessage[];
  errors: ApiFailure[];
  setUser: (user: User | null) => void;
  setConfig: (config: SafeProviderConfig | null) => void;
  setFeature: (feature: WorkspaceState["feature"]) => void;
  setPrompt: (prompt: string) => void;
  setImageUrl: (imageUrl: string) => void;
  setOutput: (output: string) => void;
  setProgress: (progress: number) => void;
  setBusy: (busy: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  pushError: (error: ApiFailure) => void;
  dismissError: (requestId: string) => void;
};

export const useWorkspace = create<WorkspaceState>((set) => ({
  user: null,
  config: null,
  feature: "image",
  prompt: "",
  imageUrl: "",
  output: "",
  progress: 0,
  busy: false,
  messages: [],
  errors: [],
  setUser: (user) => set({ user }),
  setConfig: (config) => set({ config }),
  setFeature: (feature) => set({ feature }),
  setPrompt: (prompt) => set({ prompt }),
  setImageUrl: (imageUrl) => set({ imageUrl }),
  setOutput: (output) => set({ output }),
  setProgress: (progress) => set({ progress }),
  setBusy: (busy) => set({ busy }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  pushError: (error) => set((state) => ({ errors: [error, ...state.errors].slice(0, 4) })),
  dismissError: (requestId) => set((state) => ({ errors: state.errors.filter((error) => error.requestId !== requestId) }))
}));
