import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListFilter,
  PlusCircle,
  Settings,
  LogOut,
  X,
  Loader2,
  Cpu,
  Radar,
  Radio,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isNavigating?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isNavigating = false }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'TACTICAL RADAR', sub: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'TARGET CAMPAIGNS', sub: 'Active Scans', path: '/recons', icon: ListFilter },
    { label: 'DEPLOY NEW RECON', sub: 'Attack Surface', path: '/new-recon', icon: PlusCircle },
    { label: 'SYSTEM CONFIG', sub: 'Node Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-dark-sidebar/95 backdrop-blur-2xl border-r border-dark-border/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-[8px_0_32px_rgba(0,0,0,0.6)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-dark-border/80 bg-dark-bg/60 relative overflow-hidden">
          {/* Subtle top edge glow */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/50 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(0,255,136,0.3)]">
                <Radar className="w-5 h-5 text-primary animate-radar-sweep" />
              </div>
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyber-cyan shadow-[0_0_6px_#00F0FF]" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-tech font-bold text-base tracking-wider text-white neon-text-green">
                  SUBSRECON
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyber-cyan font-mono tracking-widest font-semibold uppercase">
                  ATTACK INTEL
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-primary/20 text-primary font-mono border border-primary/30">
                  v1.0
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-dark-muted hover:text-primary rounded-lg hover:bg-dark-card transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tactical Status Pill */}
        <div className="mx-3 mt-4 mb-2 p-2.5 rounded-lg bg-dark-card/60 border border-dark-border/80 flex items-center justify-between font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-dark-muted">DEFCON:</span>
            <span className="text-primary font-bold">ALPHA-1</span>
          </div>
          <span className="text-[10px] text-dark-muted/80">RECON ACTIVE</span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-2 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-mono transition-all duration-200 border ${
                    isActive
                      ? 'bg-primary/10 border-primary/50 text-white shadow-[0_0_16px_rgba(0,255,136,0.15)] font-bold'
                      : 'border-transparent text-dark-muted hover:text-dark-text hover:bg-dark-card/60 hover:border-dark-border/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-primary neon-text-green' : 'text-dark-muted group-hover:text-primary'
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="tracking-wider">{item.label}</span>
                        <span className="text-[9px] text-dark-muted/70 font-sans">{item.sub}</span>
                      </div>
                    </div>
                    {isActive ? (
                      isNavigating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#00FF88]" />
                      )
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System telemetry box */}
        <div className="mx-3 my-2 p-3 rounded-lg bg-dark-bg/80 border border-dark-border/70 font-mono text-[10px] space-y-1.5">
          <div className="flex items-center justify-between text-dark-muted">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-cyber-cyan" /> SCAN ENGINE
            </span>
            <span className="text-primary font-bold">READY</span>
          </div>
          <div className="w-full bg-dark-border/60 h-1 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-cyber-cyan h-full w-[78%] rounded-full shadow-[0_0_6px_#00FF88]" />
          </div>
          <div className="flex justify-between text-[9px] text-dark-muted/80">
            <span>MEM: OPTIMAL</span>
            <span>PROBES: ONLINE</span>
          </div>
        </div>

        {/* User profile & Sign out */}
        <div className="p-3 border-t border-dark-border/80 bg-dark-bg/60">
          <div className="flex items-center justify-between p-2 rounded-lg bg-dark-card/50 border border-dark-border/60">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-mono font-bold text-primary shrink-0">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'O'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-mono font-bold text-dark-text truncate">
                  {user?.username || 'root'}
                </p>
                <p className="text-[9px] text-dark-muted font-mono truncate">ID: #090-OPERATOR</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 text-dark-muted hover:text-danger hover:bg-danger/10 rounded transition-colors focus:outline-none"
              title="Terminate Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
