import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  Trash2,
  ExternalLink,
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Terminal,
  Crosshair,
  Network,
} from 'lucide-react';
import { useRecons, useDeleteRecon } from '@/hooks/useRecons';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Loader } from '@/components/common/Loader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { Select, SelectOption } from '@/components/common/Select';
import { ReconSummary, ReconStatus } from '@/types/api';
import { formatDistanceToNow, parseISO } from 'date-fns';

const STATUS_OPTIONS: SelectOption<string>[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'completed', label: 'Completed', dotColor: '#00FF88' },
  { value: 'running', label: 'Running', dotColor: '#00F0FF' },
  { value: 'pending', label: 'Pending', dotColor: '#FFB000' },
  { value: 'failed', label: 'Failed', dotColor: '#FF2A5F' },
];

const SORT_OPTIONS: SelectOption<'createdAt_desc' | 'createdAt_asc' | 'name' | 'subdomains'>[] = [
  { value: 'createdAt_desc', label: 'Newest First' },
  { value: 'createdAt_asc', label: 'Oldest First' },
  { value: 'name', label: 'Campaign Name' },
  { value: 'subdomains', label: 'Subdomain Count' },
];

export const ReconList: React.FC = () => {
  const navigate = useNavigate();
  const { data: recons, isLoading, isError, error, refetch, isFetching } = useRecons();
  const deleteMutation = useDeleteRecon();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt_desc' | 'createdAt_asc' | 'name' | 'subdomains'>('createdAt_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal state for deletion confirmation
  const [reconToDelete, setReconToDelete] = useState<ReconSummary | null>(null);

  // Filter & Sort
  const filteredRecons = useMemo(() => {
    if (!recons) return [];

    return recons
      .filter((recon) => {
        // Status filter
        if (statusFilter !== 'all' && recon.status !== statusFilter) {
          return false;
        }

        // Search keyword
        if (search.trim()) {
          const query = search.trim().toLowerCase();
          const matchName = recon.name.toLowerCase().includes(query);
          const matchReportTo = recon.reportTo.toLowerCase().includes(query);
          const matchDomains = (recon.domains || []).some((d) => d.toLowerCase().includes(query));
          return matchName || matchReportTo || matchDomains;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'createdAt_desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'createdAt_asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'subdomains') {
          return (b.subdomainCount || 0) - (a.subdomainCount || 0);
        }
        return 0;
      });
  }, [recons, search, statusFilter, sortBy]);

  // Reset page to 1 whenever search, statusFilter, or sortBy changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleSortChange = (val: typeof sortBy) => {
    setSortBy(val);
    setCurrentPage(1);
  };

  // Paginated slice
  const paginatedRecons = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRecons.slice(startIndex, startIndex + pageSize);
  }, [filteredRecons, currentPage, pageSize]);

  const handleDeleteConfirm = async () => {
    if (!reconToDelete) return;
    try {
      await deleteMutation.mutateAsync(reconToDelete.id);
      setReconToDelete(null);
    } catch {
      // Handled in mutation onError
    }
  };

  if (isLoading) {
    return <Loader size="lg" text="Scanning target index registry..." className="py-24" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Target Registry Unavailable"
        message={error?.message || 'Could not fetch records from backend.'}
        onRetry={() => refetch()}
      />
    );
  }

  const getStatusBadge = (status: ReconStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/40 shadow-[0_0_8px_rgba(0,255,136,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            COMPLETED
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 animate-pulse shadow-[0_0_12px_rgba(0,240,255,0.25)]">
            <Activity className="w-3.5 h-3.5 animate-spin text-cyber-cyan" />
            SCANNING
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-danger/15 text-danger border border-danger/40 shadow-[0_0_8px_rgba(255,42,95,0.2)]">
            <XCircle className="w-3.5 h-3.5 text-danger" />
            FAILED
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-warning/15 text-warning border border-warning/40">
            <Clock className="w-3.5 h-3.5 text-warning" />
            QUEUED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-dark-border/40 text-dark-muted">
            <AlertTriangle className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-dark-border/80">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-primary mb-1">
            <Crosshair className="w-3.5 h-3.5" />
            <span>ATTACK_SURFACE // TARGET_REGISTRY</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-tech font-bold text-white tracking-wider uppercase">
            RECONNAISSANCE CAMPAIGNS
          </h2>
          <p className="text-xs text-dark-muted font-mono mt-0.5">
            Monitor Subfinder enumeration pipelines and inspect attack surface intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono">
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
            variant="primary"
            size="sm"
            onClick={() => navigate('/new-recon')}
            leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            DEPLOY RECON
          </Button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 cyber-panel rounded-xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search campaigns by name, domain, email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-primary" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 font-mono">
          {/* Status Filter */}
          <div className="w-44">
            <Select<string>
              size="sm"
              value={statusFilter}
              options={STATUS_OPTIONS}
              isSearchable={false}
              onChange={(val) => handleStatusChange(val || 'all')}
              aria-label="Filter by status"
            />
          </div>

          {/* Sort By */}
          <div className="w-48">
            <Select<'createdAt_desc' | 'createdAt_asc' | 'name' | 'subdomains'>
              size="sm"
              value={sortBy}
              options={SORT_OPTIONS}
              isSearchable={false}
              onChange={(val) => val && handleSortChange(val)}
              aria-label="Sort campaigns by"
            />
          </div>
        </div>
      </div>

      {/* Campaign Table or Empty State */}
      {filteredRecons.length === 0 ? (
        <EmptyState
          title={search || statusFilter !== 'all' ? 'NO MATCHING TARGETS' : 'NO TARGET CAMPAIGNS RECORDED'}
          description={
            search || statusFilter !== 'all'
              ? 'Adjust your reconnaissance query parameters or reset active filter states.'
              : 'Initialize your first attack surface reconnaissance scan to begin mapping hosts.'
          }
          actionLabel={search || statusFilter !== 'all' ? 'RESET FILTERS' : 'DEPLOY NEW RECON'}
          onAction={() => {
            if (search || statusFilter !== 'all') {
              setSearch('');
              setStatusFilter('all');
            } else {
              navigate('/new-recon');
            }
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto cyber-panel rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <table className="w-full text-left border-collapse font-mono">
              <thead>
                <tr className="border-b border-dark-border/80 bg-dark-bg/60 text-[11px] font-bold text-dark-muted uppercase tracking-wider">
                  <th className="py-3 px-4">CAMPAIGN TARGET</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">ROOT SCOPES</th>
                  <th className="py-3 px-4">DISCOVERED HOSTS</th>
                  <th className="py-3 px-4">INITIATED</th>
                  <th className="py-3 px-4 text-right">COMMANDS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/50 text-xs">
                {paginatedRecons.map((recon) => (
                  <tr
                    key={recon.id}
                    className="hover:bg-primary/5 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/recons/${recon.id}`)}
                  >
                    <td className="py-4 px-4">
                      <div>
                        <Link
                          to={`/recons/${recon.id}`}
                          className="font-bold text-white group-hover:text-primary transition-colors text-sm flex items-center gap-2"
                        >
                          <Terminal className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                          <span>{recon.name}</span>
                        </Link>
                        <p className="text-[11px] text-dark-muted font-sans truncate max-w-xs mt-0.5">
                          {recon.reportTo}
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      {getStatusBadge(recon.status)}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(recon.domains || []).slice(0, 3).map((domain) => (
                          <span
                            key={domain}
                            className="px-2 py-0.5 rounded bg-dark-bg/90 border border-dark-border text-dark-text text-[11px] font-mono shadow-sm"
                          >
                            {domain}
                          </span>
                        ))}
                        {(recon.domains || []).length > 3 && (
                          <span className="px-1.5 py-0.5 text-[10px] text-primary font-bold">
                            +{recon.domains.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-tech font-bold text-primary neon-text-green text-sm">
                        {recon.subdomainCount || 0}
                      </span>
                      <span className="text-[10px] text-dark-muted ml-1">subdomains</span>
                    </td>

                    <td className="py-4 px-4 text-dark-muted whitespace-nowrap text-[11px]">
                      {recon.createdAt ? (
                        formatDistanceToNow(parseISO(recon.createdAt), {
                          addSuffix: true,
                        })
                      ) : (
                        'N/A'
                      )}
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/recons/${recon.id}?tab=mapping`)}
                          aria-label={`View mapping tree for ${recon.name}`}
                          title="View Mapping Tree (Subs Graph)"
                          className="p-2 text-cyber-cyan hover:text-cyber-cyan hover:bg-cyber-cyan/15"
                        >
                          <Network className="w-4 h-4 text-cyber-cyan" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/recons/${recon.id}`)}
                          aria-label={`View details of ${recon.name}`}
                          title="View Campaign Details"
                          className="p-2 hover:text-primary"
                        >
                          <ExternalLink className="w-4 h-4 text-primary" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReconToDelete(recon)}
                          disabled={recon.status === 'running'}
                          title={
                            recon.status === 'running'
                              ? 'Active recon pipeline cannot be aborted while executing'
                              : 'Purge campaign'
                          }
                          aria-label={`Delete campaign ${recon.name}`}
                          className="p-2 text-danger/70 hover:text-danger hover:bg-danger/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reusable Pagination */}
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredRecons.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(reconToDelete)}
        onClose={() => setReconToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
        title="PURGE RECONNAISSANCE CAMPAIGN"
        message={`Are you sure you want to permanently purge "${reconToDelete?.name}"? All discovered subdomains, relationship maps, and triage logs for this target will be wiped from disk.`}
        confirmLabel="PURGE RECORD"
        variant="danger"
      />
    </div>
  );
};
export default ReconList;
