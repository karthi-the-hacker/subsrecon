import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Globe,
  Network,
  Crosshair,
  Search,
  Database,
} from 'lucide-react';
import {
  useReconDetails,
  useDeleteRecon,
  useUpdateDomainStatus,
  RECONS_QUERY_KEY,
  reconDetailQueryKey,
} from '@/hooks/useRecons';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { huntSubdomains } from '@/api/subsrecon';
import { useSEO } from '@/hooks/useSEO';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Loader } from '@/components/common/Loader';
import { ErrorState } from '@/components/common/ErrorState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { Select, SelectOption } from '@/components/common/Select';
import { ReconMappingGraph } from '@/components/recon/ReconMappingGraph';
import { ReconStatus, DomainStatus, SubdomainEntry } from '@/types/api';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

const TRIAGE_STATUS_OPTIONS: SelectOption<DomainStatus>[] = [
  { value: 'new', label: 'NEW', dotColor: '#888888', badgeVariant: 'muted' },
  { value: 'pending', label: 'PENDING', dotColor: '#FF7900', badgeVariant: 'warning' },
  { value: 'success', label: 'TRIAGED', dotColor: '#16A34A', badgeVariant: 'success' },
];

const STATUS_FILTER_OPTIONS: SelectOption<string>[] = [
  { value: 'all', label: 'All Triage Statuses' },
  { value: 'new', label: 'Status: New', dotColor: '#888888' },
  { value: 'pending', label: 'Status: Pending', dotColor: '#FF7900' },
  { value: 'success', label: 'Status: Triaged', dotColor: '#16A34A' },
];

export const ReconDetail: React.FC<{
  defaultTab?: 'mapping' | 'subdomains' | 'relationships' | 'diagnostics';
}> = ({ defaultTab }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClient = useQueryClient();
  const { data: recon, isLoading, isError, error, refetch, isFetching } = useReconDetails(id);
  const deleteMutation = useDeleteRecon();
  const updateStatusMutation = useUpdateDomainStatus(id || '');

  // Concurrent Hunts Map: hostname -> elapsedSeconds
  const [activeHunts, setActiveHunts] = useState<Record<string, number>>({});
  const activeHuntCount = Object.keys(activeHunts).length;

  useEffect(() => {
    if (Object.keys(activeHunts).length === 0) return;

    const interval = setInterval(() => {
      setActiveHunts((prev) => {
        const next: Record<string, number> = {};
        for (const [host, elapsed] of Object.entries(prev)) {
          next[host] = elapsed + 1;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [Object.keys(activeHunts).length > 0]);

  useSEO({
    title: recon ? `${recon.name} — Campaign Intelligence` : 'Campaign Intelligence',
    description: recon
      ? `Reconnaissance graph topology, discovered subdomains, and attack surface intelligence for ${recon.name}.`
      : 'Attack surface intelligence, topology mapping, and scan findings in SubsRecon.',
  });

  const tabQuery = searchParams.get('tab') as 'mapping' | 'subdomains' | 'relationships' | 'diagnostics' | null;
  const [activeTab, setActiveTab] = useState<'mapping' | 'subdomains' | 'relationships' | 'diagnostics'>(
    tabQuery || defaultTab || 'mapping'
  );

  const handleTabChange = (newTab: 'mapping' | 'subdomains' | 'relationships' | 'diagnostics') => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    }, { replace: true });
  };

  const [subdomainSearch, setSubdomainSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subdomainPage, setSubdomainPage] = useState(1);
  const [subdomainPageSize, setSubdomainPageSize] = useState(15);

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [huntTargetModal, setHuntTargetModal] = useState<{ isOpen: boolean; hostname: string }>({
    isOpen: false,
    hostname: '',
  });

  // Filter subdomains
  const filteredSubdomains = useMemo(() => {
    if (!recon?.subdomains) return [];

    return recon.subdomains.filter((sub: SubdomainEntry) => {
      const currentStatus = (recon.domainStatuses && recon.domainStatuses[sub.hostname]) || sub.status || 'new';
      if (statusFilter !== 'all' && currentStatus !== statusFilter) {
        return false;
      }

      if (subdomainSearch.trim()) {
        const query = subdomainSearch.trim().toLowerCase();
        const matchHost = sub.hostname.toLowerCase().includes(query);
        const matchRoot = (sub.rootDomain || '').toLowerCase().includes(query);
        return matchHost || matchRoot;
      }

      return true;
    });
  }, [recon?.subdomains, recon?.domainStatuses, subdomainSearch, statusFilter]);

  const paginatedSubdomains = useMemo(() => {
    const start = (subdomainPage - 1) * subdomainPageSize;
    return filteredSubdomains.slice(start, start + subdomainPageSize);
  }, [filteredSubdomains, subdomainPage, subdomainPageSize]);

  if (isLoading) {
    return <Loader size="lg" text="Decrypting campaign intelligence stream..." className="py-24" />;
  }

  if (isError || !recon) {
    return (
      <ErrorState
        title="Target Telemetry Lost"
        message={error?.message || 'Could not retrieve recon details.'}
        onRetry={() => refetch()}
      />
    );
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(recon.id);
      navigate('/recons');
    } catch {
      // Handled in mutation hook
    }
  };

  const handleStartHunt = async () => {
    const targetHost = huntTargetModal.hostname;
    if (!targetHost) return;

    if (activeHunts[targetHost] !== undefined) {
      toast.info(`Subdomain hunt already running for ${targetHost} (${activeHunts[targetHost]}s).`, {
        toastId: `hunt-already-${targetHost}`,
      });
      setHuntTargetModal({ isOpen: false, hostname: '' });
      return;
    }

    // Immediately close modal to keep viewer clear and unobstructed
    setHuntTargetModal({ isOpen: false, hostname: '' });

    // Track target in activeHunts map
    setActiveHunts((prev) => ({ ...prev, [targetHost]: 0 }));

    try {
      const res = await huntSubdomains(id || '', { hostname: targetHost });
      queryClient.invalidateQueries({ queryKey: reconDetailQueryKey(id || '') });
      queryClient.invalidateQueries({ queryKey: RECONS_QUERY_KEY });
      toast.success(
        `Subdomain hunt completed: discovered ${res.data?.count || 0} subdomains under ${targetHost}.`,
        { toastId: `hunt-success-${targetHost}` }
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || `Subdomain hunt failed for ${targetHost}.`;
      toast.error(msg, { toastId: `hunt-err-${targetHost}` });
    } finally {
      setActiveHunts((prev) => {
        const next = { ...prev };
        delete next[targetHost];
        return next;
      });
    }
  };

  const handleDomainStatusChange = async (hostname: string, newStatus: DomainStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ hostname, status: newStatus });
    } catch {
      // Handled in mutation hook
    }
  };

  const getStatusBadge = (status: ReconStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] text-xs font-mono font-bold bg-success-light text-success border border-[#BBF7D0]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            COMPLETED
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] text-xs font-mono font-bold bg-[#FFF7ED] text-primary border border-primary/40">
            <Activity className="w-3.5 h-3.5 animate-spin text-primary" />
            SUBFINDER ACTIVE
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] text-xs font-mono font-bold bg-danger-light text-danger border border-[#FECACA]">
            <XCircle className="w-3.5 h-3.5" />
            SCAN FAILED
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] text-xs font-mono font-bold bg-[#FFF7ED] text-primary border border-primary/40">
            <Clock className="w-3.5 h-3.5 text-primary" />
            QUEUED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] text-xs font-mono font-bold bg-[#FAFAFA] text-[#666666] border border-[#DCDCDC]">
            <AlertTriangle className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#DCDCDC]">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/recons')}
            aria-label="Back to campaigns"
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4 text-[#111111]" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight uppercase">
                {recon.name}
              </h2>
              {getStatusBadge(recon.status)}
            </div>
            <p className="text-xs text-[#666666] font-mono mt-1 flex items-center gap-2">
              <span className="text-primary font-bold">ID:</span>
              <span className="text-[#111111] font-bold">{recon.id}</span>
              <span className="text-[#DCDCDC]">•</span>
              <span className="text-primary font-bold">DISPATCH:</span>
              <span className="text-[#111111]">{recon.reportTo}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 font-mono">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />}
          >
            SYNC
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            disabled={recon.status === 'running'}
            title={recon.status === 'running' ? 'Active scan cannot be removed' : 'Purge Campaign'}
            className="text-danger hover:bg-danger-light"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            PURGE
          </Button>
        </div>
      </div>

      {/* Diagnostics / Error Alert if scan failed */}
      {recon.status === 'failed' && (recon.scan?.errors?.length ?? 0) > 0 && (
        <div
          role="alert"
          className="p-4 rounded-[3px] bg-danger-light border border-danger/40 text-xs text-danger space-y-2 font-mono"
        >
          <div className="flex items-center gap-2 font-bold">
            <XCircle className="w-4 h-4" />
            <span>CRITICAL ENUMERATION EXCEPTION:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] bg-white p-3 rounded-[2px] border border-danger/30">
            {recon.scan.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scope Root Domains */}
        <div className="p-4 bg-white border border-[#DCDCDC] rounded-[3px] shadow-sm">
          <div className="flex items-center justify-between text-[#666666] mb-2 font-mono">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#666666]">
              ROOT SCOPES
            </span>
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <span className="text-2xl font-bold text-[#111111]">
            {recon.domainCount || (recon.domains || []).length}
          </span>
          <div className="mt-2.5 flex flex-wrap gap-1">
            {(recon.domains || []).map((dom) => (
              <span
                key={dom}
                className="px-2 py-0.5 rounded-[2px] bg-[#FAFAFA] border border-[#DCDCDC] text-[11px] font-mono text-[#111111]"
              >
                {dom}
              </span>
            ))}
          </div>
        </div>

        {/* Discovered Subdomains */}
        <div className="p-4 bg-white border border-[#DCDCDC] rounded-[3px] shadow-sm">
          <div className="flex items-center justify-between text-[#666666] mb-2 font-mono">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#666666]">
              MAPPED ASSETS
            </span>
            <Network className="w-4 h-4 text-primary" />
          </div>
          <span className="text-2xl font-bold text-primary">
            {recon.subdomainCount || (recon.subdomains || []).length}
          </span>
          <p className="text-[11px] font-mono text-[#666666] mt-2">
            {recon.relationships?.length || 0} relational topology edges
          </p>
        </div>

        {/* Scan Timestamps */}
        <div className="p-4 bg-white border border-[#DCDCDC] rounded-[3px] shadow-sm">
          <div className="flex items-center justify-between text-[#666666] mb-2 font-mono">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#666666]">
              SCAN TIMELINE
            </span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-1 font-mono text-xs">
            <p className="text-[#666666]">
              START: <span className="text-[#111111] font-bold">{format(parseISO(recon.createdAt), 'MMM d, HH:mm')}</span>
            </p>
            <p className="text-[#666666]">
              END:{' '}
              <span className="text-[#111111] font-bold">
                {recon.completedAt ? format(parseISO(recon.completedAt), 'MMM d, HH:mm') : 'PROCESSING...'}
              </span>
            </p>
          </div>
        </div>

        {/* Database info */}
        <div className="p-4 bg-white border border-[#DCDCDC] rounded-[3px] shadow-sm">
          <div className="flex items-center justify-between text-[#666666] mb-2 font-mono">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#666666]">
              STORAGE REGISTRY
            </span>
            <Database className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs font-mono text-[#111111] truncate mt-1 font-bold">{recon.database}</p>
          <p className="text-[11px] font-mono text-[#666666] mt-2">
            Last accessed{' '}
            {formatDistanceToNow(parseISO(recon.lastUsedAt), {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DCDCDC] pb-2 font-mono overflow-x-auto">
        <button
          onClick={() => handleTabChange('mapping')}
          className={`px-4 py-2 text-xs font-bold rounded-[3px] transition-colors border flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'mapping'
              ? 'bg-[#FFF7ED] border-[#111111] text-[#111111] border-l-4 border-l-primary'
              : 'border-transparent text-[#666666] hover:text-[#111111] hover:bg-white hover:border-[#DCDCDC]'
          }`}
        >
          <Network className="w-3.5 h-3.5 text-primary" />
          MAPPING GRAPH (SUBS GRAPH)
        </button>
        <button
          onClick={() => handleTabChange('subdomains')}
          className={`px-4 py-2 text-xs font-bold rounded-[3px] transition-colors border whitespace-nowrap ${
            activeTab === 'subdomains'
              ? 'bg-[#FFF7ED] border-[#111111] text-[#111111] border-l-4 border-l-primary'
              : 'border-transparent text-[#666666] hover:text-[#111111] hover:bg-white hover:border-[#DCDCDC]'
          }`}
        >
          DISCOVERED SUBDOMAINS ({(recon.subdomains || []).length})
        </button>
        <button
          onClick={() => handleTabChange('relationships')}
          className={`px-4 py-2 text-xs font-bold rounded-[3px] transition-colors border whitespace-nowrap ${
            activeTab === 'relationships'
              ? 'bg-[#FFF7ED] border-[#111111] text-[#111111] border-l-4 border-l-primary'
              : 'border-transparent text-[#666666] hover:text-[#111111] hover:bg-white hover:border-[#DCDCDC]'
          }`}
        >
          TOPOLOGY HIERARCHY ({(recon.relationships || []).length})
        </button>
        <button
          onClick={() => handleTabChange('diagnostics')}
          className={`px-4 py-2 text-xs font-bold rounded-[3px] transition-colors border whitespace-nowrap ${
            activeTab === 'diagnostics'
              ? 'bg-[#FFF7ED] border-[#111111] text-[#111111] border-l-4 border-l-primary'
              : 'border-transparent text-[#666666] hover:text-[#111111] hover:bg-white hover:border-[#DCDCDC]'
          }`}
        >
          METADATA &amp; DIAGNOSTICS
        </button>

        {activeHuntCount > 0 && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-[#FFF7ED] border border-primary/40 text-primary text-xs rounded-[2px] font-mono whitespace-nowrap animate-fadeIn">
            <Activity className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>
              {activeHuntCount === 1 ? (
                <>
                  HUNTING: <strong>{Object.keys(activeHunts)[0]}</strong> (
                  {Object.values(activeHunts)[0]}s)
                </>
              ) : (
                <>
                  <strong>{activeHuntCount} HUNTS RUNNING</strong>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Tab 0: Mapping Graph (Subs Graph) */}
      {activeTab === 'mapping' && (
        <ReconMappingGraph
          recon={recon}
          onHunt={(hostname) => setHuntTargetModal({ isOpen: true, hostname })}
          onStatusChange={handleDomainStatusChange}
          activeHunts={activeHunts}
        />
      )}

      {/* Tab 1: Subdomains */}
      {activeTab === 'subdomains' && (
        <div className="space-y-4">
          {/* Subdomains Toolbar */}
          <div className="p-3.5 bg-white border border-[#DCDCDC] rounded-[3px] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Search discovered subdomains..."
                value={subdomainSearch}
                onChange={(e) => {
                  setSubdomainSearch(e.target.value);
                  setSubdomainPage(1);
                }}
                leftIcon={<Search className="w-3.5 h-3.5 text-primary" />}
              />
            </div>

            <div className="w-56 font-mono">
              <Select<string>
                size="sm"
                value={statusFilter}
                options={STATUS_FILTER_OPTIONS}
                isSearchable={false}
                onChange={(val) => {
                  setStatusFilter(val || 'all');
                  setSubdomainPage(1);
                }}
                aria-label="Filter subdomains by triage status"
              />
            </div>
          </div>

          {filteredSubdomains.length === 0 ? (
            <div className="p-8 text-center bg-white border border-dashed border-[#DCDCDC] rounded-[3px]">
              <p className="text-sm font-bold font-mono text-[#111111] uppercase">NO ASSETS DISCOVERED</p>
              <p className="text-xs text-[#666666] font-mono mt-1">
                {subdomainSearch || statusFilter !== 'all'
                  ? 'No target subdomains match current filter parameters.'
                  : recon.status === 'running'
                  ? 'Subfinder enumeration is actively executing. Discovered assets will appear automatically.'
                  : 'No subdomains were identified for this root perimeter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto bg-white border border-[#DCDCDC] rounded-[3px] shadow-sm">
                <table className="w-full text-left border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-[#DCDCDC] bg-[#FAFAFA] text-[11px] font-bold text-[#666666] uppercase tracking-wider">
                      <th className="py-3 px-4">DISCOVERED HOSTNAME</th>
                      <th className="py-3 px-4">ROOT SCOPE</th>
                      <th className="py-3 px-4">DEPTH / ORIGIN</th>
                      <th className="py-3 px-4">SOURCE</th>
                      <th className="py-3 px-4">TRIAGE STATUS</th>
                      <th className="py-3 px-4 text-right">TARGET ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCDCDC] text-xs">
                    {paginatedSubdomains.map((sub: SubdomainEntry, idx: number) => {
                      const currentStatus =
                        (recon.domainStatuses && recon.domainStatuses[sub.hostname]) ||
                        sub.status ||
                        'new';

                      return (
                        <tr key={`${sub.hostname}-${idx}`} className="hover:bg-[#FAFAFA] transition-colors group">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#111111]">
                            <span className="text-[#111111] group-hover:text-primary transition-colors">
                              {sub.hostname}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-[#666666] font-mono">
                            {sub.rootDomain || '-'}
                          </td>

                          <td className="py-3.5 px-4 text-[#666666] font-mono">
                            {sub.parent ? (
                              <span className="text-xs text-[#111111] font-bold">{sub.parent}</span>
                            ) : sub.depth ? (
                              `depth: ${sub.depth}`
                            ) : (
                              '-'
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-[2px] bg-[#FAFAFA] border border-[#DCDCDC] text-[10px] text-[#666666] uppercase font-mono font-bold">
                              {sub.source || 'enumeration'}
                            </span>
                          </td>

                          <td className="py-2.5 px-4 w-40">
                            <Select<DomainStatus>
                              size="sm"
                              variant="badge"
                              value={currentStatus as DomainStatus}
                              options={TRIAGE_STATUS_OPTIONS}
                              isSearchable={false}
                              disabled={updateStatusMutation.isPending}
                              onChange={(val) => {
                                if (val) {
                                  handleDomainStatusChange(sub.hostname, val);
                                }
                              }}
                              aria-label={`Triage status for ${sub.hostname}`}
                            />
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 font-mono">
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={activeHunts[sub.hostname] !== undefined}
                                onClick={() =>
                                  setHuntTargetModal({
                                    isOpen: true,
                                    hostname: sub.hostname,
                                  })
                                }
                                title={
                                  activeHunts[sub.hostname] !== undefined
                                    ? `Hunt in progress (${activeHunts[sub.hostname]}s)`
                                    : 'Run targeted hunt for subdomains under this host'
                                }
                                leftIcon={
                                  activeHunts[sub.hostname] !== undefined ? (
                                    <Activity className="w-3.5 h-3.5 animate-spin text-primary" />
                                  ) : (
                                    <Crosshair className="w-3.5 h-3.5 text-primary" />
                                  )
                                }
                                className="px-2.5 py-1 text-xs"
                              >
                                {activeHunts[sub.hostname] !== undefined
                                  ? `${activeHunts[sub.hostname]}s`
                                  : 'HUNT'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Subdomain Pagination */}
              <Pagination
                currentPage={subdomainPage}
                pageSize={subdomainPageSize}
                totalItems={filteredSubdomains.length}
                onPageChange={setSubdomainPage}
                onPageSizeChange={(newSize) => {
                  setSubdomainPageSize(newSize);
                  setSubdomainPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Relationships */}
      {activeTab === 'relationships' && (
        <div className="p-6 bg-white border border-[#DCDCDC] rounded-[3px] space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCDCDC] font-mono">
            <div>
              <h3 className="text-sm font-bold text-[#111111] tracking-wider uppercase">
                &gt; PARENT-CHILD TOPOLOGY GRAPH
              </h3>
              <p className="text-xs text-[#666666] font-sans mt-0.5">
                Hierarchical relationships reconstructed from Subfinder discoveries.
              </p>
            </div>
            <span className="text-xs text-[#111111] font-mono font-bold bg-[#FFF7ED] px-2.5 py-1 rounded-[2px] border border-primary">
              {(recon.relationships || []).length} EDGES
            </span>
          </div>

          {(recon.relationships || []).length === 0 ? (
            <p className="text-xs font-mono text-[#666666] py-8 text-center">
              NO RELATIONAL TOPOLOGY EDGES RECORDED FOR THIS CAMPAIGN.
            </p>
          ) : (
            <div className="divide-y divide-[#DCDCDC] max-h-96 overflow-y-auto font-mono text-xs pr-2">
              {(recon.relationships || []).map((rel, idx) => (
                <div key={idx} className="py-2.5 flex items-center gap-3">
                  <span className="text-[#111111] bg-[#FAFAFA] px-2.5 py-1 rounded-[2px] border border-[#DCDCDC] font-semibold">
                    {rel.parent}
                  </span>
                  <span className="text-primary font-bold">──►</span>
                  <span className="text-[#111111] bg-[#FFF7ED] px-2.5 py-1 rounded-[2px] border border-primary font-bold">
                    {rel.child}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="p-6 bg-white border border-[#DCDCDC] rounded-[3px] space-y-4 font-mono shadow-sm">
          <div className="pb-3 border-b border-[#DCDCDC]">
            <h3 className="text-sm font-bold text-[#111111] tracking-wider uppercase">
              &gt; SCAN DIAGNOSTICS &amp; ENGINE STATE
            </h3>
            <p className="text-xs text-[#666666] font-sans mt-0.5">
              Exact backend metadata registered in {recon.database}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 bg-[#FAFAFA] rounded-[3px] border border-[#DCDCDC] space-y-2">
              <span className="text-primary font-bold block border-b border-[#DCDCDC] pb-1">
                // SCAN WINDOW
              </span>
              <p>STARTED: <span className="text-[#111111] font-bold">{recon.scan?.startedAt || 'None'}</span></p>
              <p>COMPLETED: <span className="text-[#111111] font-bold">{recon.scan?.completedAt || 'None'}</span></p>
              <p>LAST ACCESS: <span className="text-[#111111]">{recon.lastUsedAt}</span></p>
            </div>
            <div className="p-4 bg-[#FAFAFA] rounded-[3px] border border-[#DCDCDC] space-y-2">
              <span className="text-primary font-bold block border-b border-[#DCDCDC] pb-1">
                // ENGINE TELEMETRY
              </span>
              <p>STATUS: <span className="text-[#111111] font-bold">{recon.status}</span></p>
              <p>ERROR TRACES: <span className="text-danger font-bold">{recon.scan?.errors?.length || 0}</span></p>
              <p>ASSETS COUNT: <span className="text-[#111111] font-bold">{recon.subdomainCount}</span></p>
            </div>
          </div>

          {(recon.scan?.errors?.length || 0) > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-bold text-danger">// ERROR LOG STREAM:</span>
              <pre className="p-3.5 rounded-[3px] bg-danger-light border border-danger/40 text-xs text-danger font-mono overflow-x-auto whitespace-pre-wrap">
                {recon.scan.errors.join('\n')}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Hunt Subdomains Modal */}
      <Modal
        isOpen={huntTargetModal.isOpen}
        onClose={() => setHuntTargetModal({ isOpen: false, hostname: '' })}
        title="TARGETED ASSET ENUMERATION"
        description="Spawns targeted Subfinder scan pipeline targeting child branches of the selected host."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs font-mono">
          <div className="p-3 bg-[#FAFAFA] rounded-[3px] border border-[#DCDCDC] flex items-center justify-between">
            <span className="text-[#666666]">TARGET HOST:</span>
            <strong className="text-[#111111] text-sm">{huntTargetModal.hostname}</strong>
          </div>

          <div className="p-3.5 rounded-[3px] bg-[#FAFAFA] border border-[#DCDCDC] text-[#666666] font-sans leading-relaxed">
            This dispatches the backend <code className="text-primary font-mono font-bold">POST /subsrecon/:id/hunt-subdomains</code> endpoint.
            Subfinder queries all configured DNS search providers for child branches under <code className="text-primary font-mono font-bold">.{huntTargetModal.hostname}</code>.
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setHuntTargetModal({ isOpen: false, hostname: '' })}
            >
              ABORT
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartHunt}
              leftIcon={<Crosshair className="w-4 h-4" />}
            >
              LAUNCH HUNT
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Campaign Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        title="PURGE RECONNAISSANCE RECORD"
        message={`Are you sure you want to delete campaign "${recon.name}"? This permanently unlinks the registry entry and deletes ${recon.database} from disk.`}
        confirmLabel="PURGE RECORD"
        variant="danger"
      />
    </div>
  );
};

export default ReconDetail;
