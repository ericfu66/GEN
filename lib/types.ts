export type Feature = "chat" | "image" | "imageToImage" | "video";

export type ProviderConfig = {
  apiBaseUrl: string;
  apiKey: string;
  models: ModelInfo[];
  defaultChatModel?: string;
  defaultImageModel?: string;
  defaultVideoModel?: string;
  // Optional secondary endpoint for LLM chat / vision
  chatApiBaseUrl?: string;
  chatApiKey?: string;
  chatModels?: ModelInfo[];
  defaultSecondaryChatModel?: string;
  systemPrompt: string;
  contextLimit: number;
  updatedAt: string;
};

export type SafeProviderConfig = Omit<ProviderConfig, "apiKey" | "chatApiKey"> & {
  hasApiKey: boolean;
  hasChatApiKey: boolean;
};

export type ModelInfo = {
  id: string;
  ownedBy?: string;
  features: Feature[];
};

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  config?: ProviderConfig;
  history: HistoryRecord[];
};

export type HistoryRecord = {
  id: string;
  type: Feature | "prompt" | "analyze";
  title: string;
  input: string;
  output?: unknown;
  status: "success" | "error" | "pending";
  error?: string;
  createdAt: string;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type PlazaEntry = {
  id: string;
  userId: string;
  userName: string;
  title: string;
  prompt: string;
  imageUrl: string;
  model?: string;
  tags: string[];
  likes: number;
  uses: number;
  createdAt: string;
};

export type ApiErrorPayload = {
  code: "UNAUTHORIZED" | "NOT_FOUND" | "RATE_LIMITED" | "TIMEOUT" | "BAD_REQUEST" | "UPSTREAM_ERROR";
  message: string;
  action?: "retry" | "configure";
  status: number;
};
