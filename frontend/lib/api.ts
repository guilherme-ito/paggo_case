import { apiClient } from './api-client';
import type {
  Document,
  LLMInteraction,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ExplainDocumentDto,
  QueryDocumentDto,
} from './types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', data);
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', response.data.access_token);
    }
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data);
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', response.data.access_token);
    }
    return response.data;
  },
};

export const documentsApi = {
  upload: async (file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/documents/upload', formData);
    return response.data;
  },

  getAll: async (): Promise<Document[]> => {
    const response = await apiClient.get('/documents');
    return response.data;
  },

  getOne: async (id: string): Promise<Document> => {
    const response = await apiClient.get(`/documents/${id}`);
    return response.data;
  },

  explain: async (id: string, context?: string): Promise<LLMInteraction> => {
    const response = await apiClient.post(`/documents/${id}/explain`, {
      context,
    });
    return response.data;
  },

  query: async (id: string, query: string): Promise<LLMInteraction> => {
    const response = await apiClient.post(`/documents/${id}/query`, {
      query,
    });
    return response.data;
  },

  download: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  reprocessOCR: async (id: string): Promise<void> => {
    await apiClient.post(`/documents/${id}/reprocess-ocr`);
  },
};

