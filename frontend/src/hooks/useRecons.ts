import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRecons,
  getRecon,
  createRecon,
  deleteRecon,
  huntSubdomains,
  updateDomainStatus,
} from '@/api/subsrecon';
import {
  CreateReconRequest,
  HuntSubdomainsRequest,
  UpdateDomainStatusRequest,
  AppError,
} from '@/types/api';
import { toast } from 'react-toastify';

export const RECONS_QUERY_KEY = ['recons'] as const;
export const reconDetailQueryKey = (id: string) => ['recons', id] as const;

export const useRecons = () => {
  return useQuery({
    queryKey: RECONS_QUERY_KEY,
    queryFn: async () => {
      const response = await getRecons();
      return response.data?.recons || [];
    },
    staleTime: 10000,
  });
};

export const useReconDetails = (id: string | undefined) => {
  return useQuery({
    queryKey: reconDetailQueryKey(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Recon ID is required');
      const response = await getRecon(id);
      if (!response.data) throw new Error('Recon details not found');
      return response.data;
    },
    enabled: Boolean(id),
    staleTime: 5000,
    refetchInterval: (query) => {
      // Auto-poll if recon is in running or pending status
      const status = query.state.data?.status;
      return status === 'running' || status === 'pending' ? 3000 : false;
    },
  });
};

export const useCreateRecon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateReconRequest) => {
      const response = await createRecon(payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: RECONS_QUERY_KEY });
      toast.success(
        `Recon "${data?.name || 'Target'}" created! Enumeration queued.`,
        { toastId: `create-recon-${data?.id}` }
      );
    },
    onError: (error: AppError) => {
      toast.error(error.message || 'Failed to create recon campaign.', {
        toastId: 'create-recon-error',
      });
    },
  });
};

export const useDeleteRecon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteRecon(id);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: RECONS_QUERY_KEY });
      queryClient.removeQueries({ queryKey: reconDetailQueryKey(id) });
      toast.success('Recon record deleted successfully.', {
        toastId: `delete-recon-${id}`,
      });
    },
    onError: (error: AppError) => {
      toast.error(error.message || 'Failed to delete recon.', {
        toastId: 'delete-recon-error',
      });
    },
  });
};

export const useHuntSubdomains = (reconId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: HuntSubdomainsRequest) => {
      const response = await huntSubdomains(reconId, payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reconDetailQueryKey(reconId) });
      queryClient.invalidateQueries({ queryKey: RECONS_QUERY_KEY });
      toast.success(
        `Subdomain hunt completed: discovered ${data?.count || 0} subdomains under ${data?.parent || 'target'}.`,
        { toastId: `hunt-${data?.parent}` }
      );
    },
    onError: (error: AppError) => {
      toast.error(error.message || 'Subdomain hunt failed.', {
        toastId: 'hunt-error',
      });
    },
  });
};

export const useUpdateDomainStatus = (reconId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateDomainStatusRequest) => {
      const response = await updateDomainStatus(reconId, payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reconDetailQueryKey(reconId) });
      toast.success(`Updated status of ${data?.hostname} to "${data?.status}".`, {
        toastId: `domain-status-${data?.hostname}`,
      });
    },
    onError: (error: AppError) => {
      toast.error(error.message || 'Failed to update domain status.', {
        toastId: 'domain-status-error',
      });
    },
  });
};
