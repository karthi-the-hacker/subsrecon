import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  Globe,
  Network,
  PlusCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radar,
  Terminal,
  Crosshair,
  Radio,
  Cpu,
} from 'lucide-react';
import { useRecons } from '@/hooks/useRecons';
import { useSEO } from '@/hooks/useSEO';
import { Button } from '@/components/common/Button';
import { Loader } from '@/components/common/Loader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ReconStatus } from '@/types/api';
import { formatDistanceToNow, parseISO } from 'date-fns';

export const Dashboard: React.FC = () => {
  useSEO({
    title: 'Tactical Radar & Telemetry',
    description: 'Real-time telemetry, campaign metrics, tool inventory, and attack surface overview in SubsRecon.',
  });

  const navigate = useNavigate();
  const { data: recons, isLoading, isError, error, refetch, isFetching } = useRecons();

  if (isLoading) {
    return <Loader size="lg" text="Syncing real-time reconnaissance matrix..." className="py-24" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Telemetry Uplink Interrupted"
        message={error?.message || 'Could not fetch reconnaissance telemetry from local engine.'}
        onRetry={() => refetch()}
      />
    );
  }

  const allRecons = recons || [];

  // Derived stats strictly from real data
  const totalCampaigns = allRecons.length;
  const runningCampaigns = allRecons.filter((r) => r.status === 'running').length;
  const completedCampaigns = allRecons.filter((r) => r.status === 'completed').length;
  const failedCampaigns = allRecons.filter((r) => r.status === 'failed').length;

  const totalRootDomains = allRecons.reduce(
    (acc, r) => acc + (typeof r.domainCount === 'number' ? r.domainCount : (r.domains || []).length),
    0
  );

  const totalSubdomains = allRecons.reduce(
    (acc, r) => acc + (typeof r.subdomainCount === 'number' ? r.subdomainCount : 0),
    0
  );

  // Recent 5 campaigns sorted by createdAt desc
  const recentRecons = [...allRecons]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusBadge = (status: ReconStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-xs font-mono font-bold bg-success-light text-success border border-[#BBF7D0]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            COMPLETED
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-xs font-mono font-bold bg-[#FFF7ED] text-primary border border-primary/40">
            <Activity className="w-3.5 h-3.5 animate-spin text-primary" />
            SCANNING
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-xs font-mono font-bold bg-danger-light text-danger border border-[#FECACA]">
            <XCircle className="w-3.5 h-3.5" />
            FAILED
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-xs font-mono font-bold bg-[#FFF7ED] text-primary border border-primary/40">
            <Clock className="w-3.5 h-3.5 text-primary" />
            QUEUED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-xs font-mono font-medium bg-[#FAFAFA] text-[#666666] border border-[#DCDCDC]">
            <AlertTriangle className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCDCDC]">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-primary mb-1">
            <Radio className="w-3.5 h-3.5" />
            <span className="font-bold">RADAR_TELEMETRY // LIVE INTELLIGENCE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight uppercase">
            ATTACK SURFACE COMMAND
          </h2>
          <p className="text-xs text-[#666666] font-mono mt-0.5">
            Real-time passive &amp; active asset discovery synchronized with local SubsRecon core.
          </p>
        </div>

        <div className="flex items-center gap-2.5 font-mono">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />}
          >
            SYNC RADAR
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/new-recon')}
            leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            DEPLOY SCAN
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Campaigns */}
        <div className="p-5 bg-white border border-[#DCDCDC] rounded-[3px] hover:border-[#111111] transition-colors relative group shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[#666666]">
              TARGET CAMPAIGNS
            </span>
            <div className="p-2 rounded-[3px] bg-[#FFF7ED] border border-primary/30 text-primary">
              <Crosshair className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#111111]">
              {totalCampaigns}
            </span>
            {runningCampaigns > 0 && (
              <span className="text-xs font-mono text-primary font-bold">
                [{runningCampaigns} ACTIVE]
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-[#666666] mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Stored records in LowDB engine
          </p>
        </div>

        {/* Root Domains */}
        <div className="p-5 bg-white border border-[#DCDCDC] rounded-[3px] hover:border-[#111111] transition-colors relative group shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[#666666]">
              SCOPE ROOT DOMAINS
            </span>
            <div className="p-2 rounded-[3px] bg-[#FFF7ED] border border-primary/30 text-primary">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-[#111111]">
              {totalRootDomains}
            </span>
          </div>
          <p className="text-[11px] font-mono text-[#666666] mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Target perimeter domains authorized
          </p>
        </div>

        {/* Subdomains Discovered */}
        <div className="p-5 bg-white border border-[#DCDCDC] rounded-[3px] hover:border-[#111111] transition-colors relative group shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[#666666]">
              DISCOVERED ASSETS
            </span>
            <div className="p-2 rounded-[3px] bg-[#FFF7ED] border border-primary/30 text-primary">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-primary">
              {totalSubdomains}
            </span>
          </div>
          <p className="text-[11px] font-mono text-[#666666] mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Identified hosts &amp; attack surfaces
          </p>
        </div>

        {/* Completed vs Failed */}
        <div className="p-5 bg-white border border-[#DCDCDC] rounded-[3px] hover:border-[#111111] transition-colors relative group shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[#666666]">
              SCAN RESOLUTIONS
            </span>
            <div className="p-2 rounded-[3px] bg-[#FFF7ED] border border-primary/30 text-primary">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 font-mono">
            <span className="text-sm text-success font-bold">
              ✓ {completedCampaigns} DONE
            </span>
            <span className="text-sm text-danger font-bold">
              ✕ {failedCampaigns} FAILED
            </span>
          </div>
          <p className="text-[11px] font-mono text-[#666666] mt-2">
            {runningCampaigns > 0 ? `${runningCampaigns} background processes scanning` : 'All background threads idle'}
          </p>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white border border-[#DCDCDC] rounded-[3px] p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#DCDCDC]">
          <div className="flex items-center gap-2.5 font-mono">
            <Radar className="w-4 h-4 text-primary" />
            <h3 className="text-xs sm:text-sm font-bold text-[#111111] tracking-wider uppercase">
              RECENT TARGET CAMPAIGNS
            </h3>
          </div>
          {allRecons.length > 0 && (
            <Link
              to="/recons"
              className="text-xs font-mono font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors hover:underline"
            >
              <span>VIEW_ALL_CAMPAIGNS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {allRecons.length === 0 ? (
          <EmptyState
            title="NO ACTIVE RECONNAISSANCE RECORDS"
            description="No reconnaissance campaigns have been executed on this node. Launch your first attack surface scan."
            actionLabel="DEPLOY NEW CAMPAIGN"
            onAction={() => navigate('/new-recon')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="border-b border-[#DCDCDC] bg-[#FAFAFA] text-[11px] font-bold text-[#666666] uppercase tracking-wider">
                  <th className="py-3 px-3">CAMPAIGN TARGET</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-3">ROOT SCOPE</th>
                  <th className="py-3 px-3">DISCOVERED</th>
                  <th className="py-3 px-3">INITIATED</th>
                  <th className="py-3 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCDCDC] text-xs">
                {recentRecons.map((recon) => {
                  const rootCount =
                    typeof recon.domainCount === 'number'
                      ? recon.domainCount
                      : (recon.domains || []).length;
                  const subCount = recon.subdomainCount || 0;

                  return (
                    <tr
                      key={recon.id}
                      className="hover:bg-[#FAFAFA] transition-colors group cursor-pointer"
                      onClick={() => navigate(`/recons/${recon.id}`)}
                    >
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-[#111111] group-hover:text-primary transition-colors flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate max-w-[180px] sm:max-w-xs">{recon.name}</span>
                        </div>
                        <div className="text-[11px] text-[#666666] font-sans truncate max-w-[180px] sm:max-w-xs">
                          Report: {recon.reportTo}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {getStatusBadge(recon.status)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-[#666666]">
                        <span className="font-bold text-[#111111]">{rootCount}</span> roots
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-primary">{subCount}</span>
                        <span className="text-[11px] text-[#666666] ml-1">subdomains</span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-[11px] text-[#666666]">
                        {recon.createdAt ? (
                          formatDistanceToNow(parseISO(recon.createdAt), { addSuffix: true })
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/recons/${recon.id}`);
                          }}
                          rightIcon={<ArrowRight className="w-3.5 h-3.5 text-primary" />}
                        >
                          INSPECT
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
