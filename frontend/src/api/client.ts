import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AppError } from '@/types/api';

const TOKEN_KEY = 'subsrecon_jwt_token';
const USER_KEY = 'subsrecon_user';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredAuth = (token: string, username: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, username);
};

export const clearStoredAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUsername = (): string | null => {
  return localStorage.getItem(USER_KEY);
};

// Event emitter / callback for 401 handling
type UnauthorizedListener = () => void;
const unauthorizedListeners: Set<UnauthorizedListener> = new Set();

export const onUnauthorized = (listener: UnauthorizedListener): (() => void) => {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
};

const notifyUnauthorized = () => {
  unauthorizedListeners.forEach((listener) => listener());
};

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9090';
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(normalizeError(error));
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalized = normalizeError(error);
    if (normalized.type === 'UNAUTHORIZED') {
      clearStoredAuth();
      notifyUnauthorized();
    }
    return Promise.reject(normalized);
  }
);

export function normalizeError(error: unknown): AppError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; success?: boolean }>;

    // Timeout
    if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
      return {
        type: 'TIMEOUT',
        message: 'Request timed out after 30 seconds. Please try again.',
        status: 408,
        originalError: axiosError,
      };
    }

    // Network down / connection refused
    if (!axiosError.response) {
      return {
        type: 'NETWORK_ERROR',
        message: 'Unable to connect to the SubsRecon service. Please ensure the backend is running.',
        originalError: axiosError,
      };
    }

    const status = axiosError.response.status;
    const responseData = axiosError.response.data;
    const serverMessage = typeof responseData === 'object' && responseData && 'message' in responseData
      ? String(responseData.message)
      : undefined;

    switch (status) {
      case 400:
        return {
          type: 'VALIDATION',
          message: serverMessage || 'Invalid request parameters.',
          status,
          originalError: axiosError,
        };
      case 401:
        return {
          type: 'UNAUTHORIZED',
          message: serverMessage || 'Authentication required or session expired.',
          status,
          originalError: axiosError,
        };
      case 403:
        return {
          type: 'FORBIDDEN',
          message: serverMessage || 'Access denied or target outside configured scope.',
          status,
          originalError: axiosError,
        };
      case 404:
        return {
          type: 'NOT_FOUND',
          message: serverMessage || 'Resource not found.',
          status,
          originalError: axiosError,
        };
      case 409:
        return {
          type: 'CONFLICT',
          message: serverMessage || 'Resource conflict.',
          status,
          originalError: axiosError,
        };
      case 413:
        return {
          type: 'VALIDATION',
          message: serverMessage || 'Request payload too large.',
          status,
          originalError: axiosError,
        };
      default:
        if (status >= 500) {
          return {
            type: 'SERVER_ERROR',
            message: serverMessage || 'Internal server error occurred.',
            status,
            originalError: axiosError,
          };
        }
        return {
          type: 'UNKNOWN',
          message: serverMessage || `Request failed with status ${status}`,
          status,
          originalError: axiosError,
        };
    }
  }

  if (error instanceof SyntaxError) {
    return {
      type: 'PARSE_ERROR',
      message: 'Failed to parse response JSON.',
      originalError: error,
    };
  }

  if (error && typeof error === 'object' && 'type' in error && 'message' in error) {
    return error as AppError;
  }

  return {
    type: 'UNKNOWN',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    originalError: error,
  };
}
