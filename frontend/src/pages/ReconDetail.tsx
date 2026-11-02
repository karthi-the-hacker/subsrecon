import React, { useState, useMemo } from 'react';
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
  useHuntSubdomains,
  useUpdateDomainStatus,
} from '@/hooks/useRecons';
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
  { value: 'new', label: 'NEW', dotColor: '#64748B', badgeVariant: 'muted' },
  { value: 'pending', label: 'PENDING', dotColor: '#FFB000', badgeVariant: 'warning' },
  { value: 'success', label: 'TRIAGED', dotColor: '#00FF88', badgeVariant: 'success' },
];

const STATUS_FILTER_OPTIONS: SelectOption<string>[] = [
  { value: 'all', label: 'All Triage Statuses' },
  { value: 'new', label: 'Status: New', dotColor: '#64748B' },
  { value: 'pending', label: 'Status: Pending', dotColor: '#FFB000' },
  { value: 'success', label: 'Status: Triaged', dotColor: '#00FF88' },
];

export const ReconDetail: React.FC<{
  defaultTab?: 'mapping' | 'subdomains' | 'relationships' | 'diagnostics';
}> = ({ defaultTab }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: recon, isLoading, isError, error, refetch, isFetching } = useReconDetails(id);
  const deleteMutation = useDeleteRecon();
  const huntMutation = useHuntSubdomains(id || '');
  const updateStatusMutation = useUpdateDomainStatus(id || '');

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
      // Status filter
      const currentStatus = (recon.domainStatuses && recon.domainStatuses[sub.hostname]) || sub.status || 'new';
      if (statusFilter !== 'all' && currentStatus !== statusFilter) {
        return false;
      }

      // Search query
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
    if (!huntTargetModal.hostname) return;
    try {
      await huntMutation.mutateAsync({ hostname: huntTargetModal.hostname });
      setHuntTargetModal({ isOpen: false, hostname: '' });
    } catch {
      // Handled in mutation hook
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/40 shadow-[0_0_10px_rgba(0,255,136,0.25)]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            COMPLETED
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 animate-pulse shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <Activity className="w-3.5 h-3.5 animate-spin text-cyber-cyan" />
            SUBFINDER ACTIVE
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-danger/15 text-danger border border-danger/40 shadow-[0_0_10px_rgba(255,42,95,0.2)]">
            <XCircle className="w-3.5 h-3.5" />
            SCAN FAILED
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-warning/15 text-warning border border-warning/40">
            <Clock className="w-3.5 h-3.5" />
            QUEUED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-dark-border/40 text-dark-muted">
            <AlertTriangle className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 font-sans">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-dark-border/80">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/recons')}
            aria-label="Back to campaigns"
            className="p-2 text-dark-muted hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-tech font-bold text-white tracking-wider uppercase">
                {recon.name}
              </h2>
              {getStatusBadge(recon.status)}
            </div>
            <p className="text-xs text-dark-muted font-mono mt-1 flex items-center gap-2">
              <span className="text-primary font-bold">ID:</span>
              <span className="text-dark-text">{recon.id}</span>
              <span className="text-dark-border">•</span>
              <span className="text-cyber-cyan font-bold">DISPATCH:</span>
              <span>{recon.reportTo}</span>
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
            className="text-danger/80 hover:text-danger hover:bg-danger/10"
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
          className="p-4 rounded-xl bg-danger/15 border border-danger/40 text-xs text-danger space-y-2 font-mono shadow-[0_0_20px_rgba(255,42,95,0.25)]"
        >
          <div className="flex items-center gap-2 font-bold">
            <XCircle className="w-4 h-4" />
            <span>CRITICAL ENUMERATION EXCEPTION:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] bg-dark-bg/90 p-3 rounded-lg border border-danger/30">
            {recon.scan.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scope Root Domains */}
        <div className="p-4 cyber-panel rounded-xl relative cyber-corners group">
          <div className="flex items-center justify-between text-dark-muted mb-2 font-mono">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors">
              ROOT SCOPES
            </span>
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <span className="text-2xl font-tech font-bold text-white neon-text-green">
            {recon.domainCount || (recon.domains || []).length}
          </span>
          <div className="mt-2.5 flex flex-wrap gap-1">
            {(recon.domains || []).map((dom) => (
              <span
                key={dom}
                className="px-2 py-0.5 rounded bg-dark-bg/90 border border-dark-border text-[11px] font-mono text-dark-text shadow-sm"
              >
                {dom}
              </span>
            ))}
          </div>
        </div>

        {/* Discovered Subdomains */}
        <div className="p-4 cyber-panel rounded-xl relative cyber-corners group">
          <div className="flex items-center justify-between text-dark-muted mb-2 font-mono">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-cyber-cyan transition-colors">
              MAPPED ASSETS
            </span>
            <Network className="w-4 h-4 text-cyber-cyan" />
          </div>
          <span className="text-2xl font-tech font-bold text-white neon-text-cyan">
            {recon.subdomainCount || (recon.subdomains || []).length}
          </span>
          <p className="text-[11px] font-mono text-dark-muted mt-2">
            {recon.relationships?.length || 0} relational topology edges
          </p>
        </div>

        {/* Scan Timestamps */}
        <div className="p-4 cyber-panel rounded-xl relative cyber-corners group">
          <div className="flex items-center justify-between text-dark-muted mb-2 font-mono">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-warning transition-colors">
              SCAN TIMELINE
            </span>
            <Clock className="w-4 h-4 text-warning" />
          </div>
          <div className="space-y-1 font-mono text-xs">
            <p className="text-dark-muted">
              START: <span className="text-dark-text font-bold">{format(parseISO(recon.createdAt), 'MMM d, HH:mm')}</span>
            </p>
            <p className="text-dark-muted">
              END:{' '}
              <span className="text-dark-text font-bold">
                {recon.completedAt ? format(parseISO(recon.completedAt), 'MMM d, HH:mm') : 'PROCESSING...'}
              </span>
            </p>
          </div>
        </div>

        {/* Database info */}
        <div className="p-4 cyber-panel rounded-xl relative cyber-corners group">
          <div className="flex items-center justify-between text-dark-muted mb-2 font-mono">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors">
              STORAGE REGISTRY
            </span>
            <Database className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs font-mono text-dark-text truncate mt-1 font-semibold">{recon.database}</p>
          <p className="text-[11px] font-mono text-dark-muted mt-2">
            Last accessed{' '}
            {formatDistanceToNow(parseISO(recon.lastUsedAt), {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-dark-border/80 pb-2 font-mono overflow-x-auto">
        <button
          onClick={() => handleTabChange('mapping')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 border flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'mapping'
              ? 'bg-primary/15 border-primary text-primary shadow-[0_0_15px_rgba(0,255,136,0.3)]'
              : 'border-transparent text-dark-muted hover:text-dark-text hover:bg-dark-card/60'
          }`}
        >
          <Network className="w-3.5 h-3.5 text-primary" />
          MAPPING GRAPH (SUBS GRAPH)
        </button>
        <button
          onClick={() => handleTabChange('subdomains')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 border whitespace-nowrap ${
            activeTab === 'subdomains'
              ? 'bg-primary/10 border-primary text-white shadow-[0_0_15px_rgba(0,255,136,0.2)]'
              : 'border-transparent text-dark-muted hover:text-dark-text hover:bg-dark-card/60'
          }`}
        >
          DISCOVERED SUBDOMAINS ({(recon.subdomains || []).length})
        </button>
        <button
          onClick={() => handleTabChange('relationships')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 border whitespace-nowrap ${
            activeTab === 'relationships'
              ? 'bg-primary/10 border-primary text-white shadow-[0_0_15px_rgba(0,255,136,0.2)]'
              : 'border-transparent text-dark-muted hover:text-dark-text hover:bg-dark-card/60'
          }`}
        >
          TOPOLOGY HIERARCHY ({(recon.relationships || []).length})
        </button>
        <button
          onClick={() => handleTabChange('diagnostics')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 border whitespace-nowrap ${
            activeTab === 'diagnostics'
              ? 'bg-primary/10 border-primary text-white shadow-[0_0_15px_rgba(0,255,136,0.2)]'
              : 'border-transparent text-dark-muted hover:text-dark-text hover:bg-dark-card/60'
          }`}
        >
          METADATA &amp; DIAGNOSTICS
        </button>
      </div>

      {/* Tab 0: Mapping Graph (Subs Graph) */}
      {activeTab === 'mapping' && (
        <ReconMappingGraph
          recon={recon}
          onHunt={(hostname) => setHuntTargetModal({ isOpen: true, hostname })}
          onStatusChange={handleDomainStatusChange}
        />
      )}

      {/* Tab 1: Subdomains */}
      {activeTab === 'subdomains' && (
        <div className="space-y-4">
          {/* Subdomains Toolbar */}
          <div className="p-3.5 cyber-panel rounded-xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
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
            <div className="p-8 text-center cyber-panel rounded-xl border-dashed">
              <p className="text-sm font-bold font-mono text-dark-text uppercase">NO ASSETS DISCOVERED</p>
              <p className="text-xs text-dark-muted font-mono mt-1">
                {subdomainSearch || statusFilter !== 'all'
                  ? 'No target subdomains match current filter parameters.'
                  : recon.status === 'running'
                  ? 'Subfinder enumeration is actively executing. Discovered assets will appear automatically.'
                  : 'No subdomains were identified for this root perimeter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto cyber-panel rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <table className="w-full text-left border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-dark-border/80 bg-dark-bg/60 text-[11px] font-bold text-dark-muted uppercase tracking-wider">
                      <th className="py-3 px-4">DISCOVERED HOSTNAME</th>
                      <th className="py-3 px-4">ROOT SCOPE</th>
                      <th className="py-3 px-4">DEPTH / ORIGIN</th>
                      <th className="py-3 px-4">SOURCE</th>
                      <th className="py-3 px-4">TRIAGE STATUS</th>
                      <th className="py-3 px-4 text-right">TARGET ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/50 text-xs">
                    {paginatedSubdomains.map((sub: SubdomainEntry, idx: number) => {
                      const currentStatus =
                        (recon.domainStatuses && recon.domainStatuses[sub.hostname]) ||
                        sub.status ||
                        'new';

                      return (
                        <tr key={`${sub.hostname}-${idx}`} className="hover:bg-primary/5 transition-colors group">
                          <td className="py-3.5 px-4 font-mono font-bold text-dark-text">
                            <span className="text-primary group-hover:neon-text-green transition-colors">
                              {sub.hostname}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-dark-muted font-mono">
                            {sub.rootDomain || '-'}
                          </td>

                          <td className="py-3.5 px-4 text-dark-muted font-mono">
                            {sub.parent ? (
                              <span className="text-xs text-cyber-cyan font-bold">{sub.parent}</span>
                            ) : sub.depth ? (
                              `depth: ${sub.depth}`
                            ) : (
                              '-'
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-dark-bg/80 border border-dark-border text-[10px] text-dark-muted uppercase font-mono">
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
                              {/* Targeted Hunt Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setHuntTargetModal({
                                    isOpen: true,
                                    hostname: sub.hostname,
                                  })
                                }
                                title="Run targeted hunt for subdomains under this host"
                                leftIcon={<Crosshair className="w-3.5 h-3.5 text-primary" />}
                                className="px-2.5 py-1 text-xs"
                              >
                                HUNT
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
        <div className="p-6 cyber-panel rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-border/80 font-mono">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wider uppercase">
                &gt; PARENT-CHILD TOPOLOGY GRAPH
              </h3>
              <p className="text-xs text-dark-muted font-sans mt-0.5">
                Hierarchical relationships reconstructed from Subfinder discoveries.
              </p>
            </div>
            <span className="text-xs text-primary font-mono font-bold bg-primary/10 px-2.5 py-1 rounded border border-primary/30">
              {(recon.relationships || []).length} EDGES
            </span>
          </div>

          {(recon.relationships || []).length === 0 ? (
            <p className="text-xs font-mono text-dark-muted py-8 text-center">
              NO RELATIONAL TOPOLOGY EDGES RECORDED FOR THIS CAMPAIGN.
            </p>
          ) : (
            <div className="divide-y divide-dark-border/50 max-h-96 overflow-y-auto font-mono text-xs pr-2">
              {(recon.relationships || []).map((rel, idx) => (
                <div key={idx} className="py-2.5 flex items-center gap-3">
                  <span className="text-dark-muted bg-dark-bg/90 px-2.5 py-1 rounded border border-dark-border font-semibold">
                    {rel.parent}
                  </span>
                  <span className="text-primary font-bold neon-text-green">──►</span>
                  <span className="text-primary bg-dark-bg/90 px-2.5 py-1 rounded border border-primary/30 font-bold shadow-[0_0_8px_rgba(0,255,136,0.15)]">
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
        <div className="p-6 cyber-panel rounded-xl space-y-4 font-mono">
          <div className="pb-3 border-b border-dark-border/80">
            <h3 className="text-sm font-bold text-white tracking-wider uppercase">
              &gt; SCAN DIAGNOSTICS &amp; ENGINE STATE
            </h3>
            <p className="text-xs text-dark-muted font-sans mt-0.5">
              Exact backend metadata registered in {recon.database}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 bg-dark-bg/90 rounded-lg border border-dark-border space-y-2">
              <span className="text-primary font-bold block border-b border-dark-border/60 pb-1">
                // SCAN WINDOW
              </span>
              <p>STARTED: <span className="text-dark-text">{recon.scan?.startedAt || 'None'}</span></p>
              <p>COMPLETED: <span className="text-dark-text">{recon.scan?.completedAt || 'None'}</span></p>
              <p>LAST ACCESS: <span className="text-dark-text">{recon.lastUsedAt}</span></p>
            </div>
            <div className="p-4 bg-dark-bg/90 rounded-lg border border-dark-border space-y-2">
              <span className="text-cyber-cyan font-bold block border-b border-dark-border/60 pb-1">
                // ENGINE TELEMETRY
              </span>
              <p>STATUS: <span className="text-primary font-bold">{recon.status}</span></p>
              <p>ERROR TRACES: <span className="text-danger">{recon.scan?.errors?.length || 0}</span></p>
              <p>ASSETS COUNT: <span className="text-dark-text font-bold">{recon.subdomainCount}</span></p>
            </div>
          </div>

          {(recon.scan?.errors?.length || 0) > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-bold text-danger">// ERROR LOG STREAM:</span>
              <pre className="p-3.5 rounded-lg bg-dark-bg/90 border border-danger/40 text-xs text-danger font-mono overflow-x-auto whitespace-pre-wrap shadow-[0_0_15px_rgba(255,42,95,0.2)]">
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
          <div className="p-3 bg-dark-bg/90 rounded-lg border border-primary/30 flex items-center justify-between">
            <span className="text-dark-muted">TARGET HOST:</span>
            <strong className="text-primary neon-text-green text-sm">{huntTargetModal.hostname}</strong>
          </div>

          <div className="p-3.5 rounded-lg bg-dark-bg/80 border border-dark-border text-dark-muted font-sans leading-relaxed">
            This dispatches the backend <code className="text-primary font-mono">POST /subsrecon/:id/hunt-subdomains</code> endpoint.
            Subfinder queries all configured DNS search providers for child branches under <code className="text-primary font-mono">.{huntTargetModal.hostname}</code>.
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setHuntTargetModal({ isOpen: false, hostname: '' })}
              disabled={huntMutation.isPending}
            >
              ABORT
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartHunt}
              isLoading={huntMutation.isPending}
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
