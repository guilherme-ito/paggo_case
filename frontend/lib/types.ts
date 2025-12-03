export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  uploadStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  ocrResult?: OCRResult;
  llmInteractions?: LLMInteraction[];
  _count?: {
    llmInteractions: number;
  };
}

export interface OCRResult {
  id: string;
  documentId: string;
  extractedText: string;
  summary?: string;
  confidence?: number;
  processingTime?: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LLMInteraction {
  id: string;
  documentId: string;
  type: 'EXPLANATION' | 'QUERY';
  prompt: string;
  response: string;
  tokensUsed?: number;
  model?: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
