import { apiClient } from './client';
import { ApiResponse } from '@/types/api';
import {
  SecurityTool,
  ToolCategory,
  ToolStats,
  DetectionResult,
  DetectionHistoryEntry,
  ToolHealthCheckResult,
  CreateToolPayload,
} from '@/types/toolArsenal';

export const createTool = async (
  payload: CreateToolPayload
): Promise<ApiResponse<SecurityTool>> => {
  const response = await apiClient.post<ApiResponse<SecurityTool>>('/api/tools', payload);
  return response.data;
};

export const deleteTool = async (
  id: string
): Promise<ApiResponse<{ id: string; deleted: boolean }>> => {
  const response = await apiClient.delete<ApiResponse<{ id: string; deleted: boolean }>>(`/api/tools/${id}`);
  return response.data;
};

export const getTools = async (): Promise<ApiResponse<SecurityTool[]>> => {
  const response = await apiClient.get<ApiResponse<SecurityTool[]>>('/api/tools');
  return response.data;
};

export const detectTools = async (): Promise<ApiResponse<DetectionResult>> => {
  const response = await apiClient.post<ApiResponse<DetectionResult>>('/api/tools/detect');
  return response.data;
};

export const getToolCategories = async (): Promise<ApiResponse<ToolCategory[]>> => {
  const response = await apiClient.get<ApiResponse<ToolCategory[]>>('/api/tools/categories');
  return response.data;
};

export const getToolStats = async (): Promise<ApiResponse<ToolStats>> => {
  const response = await apiClient.get<ApiResponse<ToolStats>>('/api/tools/stats');
  return response.data;
};

export const getToolById = async (id: string): Promise<ApiResponse<SecurityTool>> => {
  const response = await apiClient.get<ApiResponse<SecurityTool>>(`/api/tools/${id}`);
  return response.data;
};

export const checkToolHealth = async (id: string): Promise<ApiResponse<ToolHealthCheckResult>> => {
  const response = await apiClient.post<ApiResponse<ToolHealthCheckResult>>(`/api/tools/${id}/health`);
  return response.data;
};

export const updateTool = async (
  id: string,
  payload: { enabled: boolean }
): Promise<ApiResponse<SecurityTool>> => {
  const response = await apiClient.patch<ApiResponse<SecurityTool>>(`/api/tools/${id}`, payload);
  return response.data;
};

export const getDetectionHistory = async (): Promise<ApiResponse<DetectionHistoryEntry[]>> => {
  const response = await apiClient.get<ApiResponse<DetectionHistoryEntry[]>>('/api/tools/detection-history');
  return response.data;
};
