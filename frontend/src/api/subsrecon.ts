import { apiClient } from './client';
import {
  ApiResponse,
  LoginRequest,
  LoginResponseData,
  ReconListResponseData,
  CreateReconRequest,
  CreateReconResponseData,
  ReconDetail,
  DeleteReconResponseData,
  HuntSubdomainsRequest,
  HuntSubdomainsResponseData,
  UpdateDomainStatusRequest,
  UpdateDomainStatusResponseData,
} from '@/types/api';

export const checkHealth = async (): Promise<ApiResponse<{ status?: string }>> => {
  const response = await apiClient.get<ApiResponse<{ status?: string }>>('/');
  return response.data;
};

export const login = async (credentials: LoginRequest): Promise<ApiResponse<LoginResponseData>> => {
  const response = await apiClient.post<ApiResponse<LoginResponseData>>('/login', credentials);
  return response.data;
};

export const logout = async (): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>('/logout');
  return response.data;
};

export const getRecons = async (): Promise<ApiResponse<ReconListResponseData>> => {
  const response = await apiClient.get<ApiResponse<ReconListResponseData>>('/subsrecon');
  return response.data;
};

export const getRecon = async (uuid: string): Promise<ApiResponse<ReconDetail>> => {
  const response = await apiClient.get<ApiResponse<ReconDetail>>(`/subsrecon/${uuid}`);
  return response.data;
};

export const createRecon = async (
  payload: CreateReconRequest
): Promise<ApiResponse<CreateReconResponseData>> => {
  const response = await apiClient.post<ApiResponse<CreateReconResponseData>>('/newrecon', payload);
  return response.data;
};

export const deleteRecon = async (
  uuid: string
): Promise<ApiResponse<DeleteReconResponseData>> => {
  const response = await apiClient.delete<ApiResponse<DeleteReconResponseData>>(`/subsrecon/${uuid}`);
  return response.data;
};

export const huntSubdomains = async (
  reconId: string,
  payload: HuntSubdomainsRequest
): Promise<ApiResponse<HuntSubdomainsResponseData>> => {
  const response = await apiClient.post<ApiResponse<HuntSubdomainsResponseData>>(
    `/subsrecon/${reconId}/hunt-subdomains`,
    payload
  );
  return response.data;
};

export const updateDomainStatus = async (
  reconId: string,
  payload: UpdateDomainStatusRequest
): Promise<ApiResponse<UpdateDomainStatusResponseData>> => {
  const response = await apiClient.patch<ApiResponse<UpdateDomainStatusResponseData>>(
    `/subsrecon/${reconId}/domain-status`,
    payload
  );
  return response.data;
};
