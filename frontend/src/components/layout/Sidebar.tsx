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
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r-2 border-[#111111] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#111111] bg-white relative">
          <div className="flex items-center gap-3">
            {/* Radar / Target Logo */}
            <div className="w-8 h-8 rounded-[3px] bg-white border-2 border-[#111111] flex items-center justify-center text-primary">
              <Radar className="w-5 h-5 text-primary" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-tech font-bold text-base tracking-wider text-[#111111]">
                  SUBSRECON
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#666666] font-mono tracking-widest font-bold uppercase">
                  ATTACK INTEL
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded-[2px] bg-[#FFF7ED] text-primary font-mono font-bold border border-primary">
                  v1.0
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-[#111111] hover:text-primary rounded-[3px] hover:bg-[#FAFAFA] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tactical Status Banner */}
        <div className="mx-3 mt-4 mb-2 p-2.5 rounded-[3px] bg-[#FAFAFA] border border-[#DCDCDC] flex items-center justify-between font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-primary" />
            <span className="text-[#666666]">DEFCON:</span>
            <span className="text-primary font-bold">ALPHA-1</span>
          </div>
          <span className="text-[10px] text-[#111111] font-bold">RECON ACTIVE</span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-3 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between px-3 py-2.5 rounded-[3px] text-xs font-mono transition-colors border ${
                    isActive
                      ? 'bg-[#FFF7ED] border-[#111111] text-[#111111] font-bold border-l-4 border-l-primary'
                      : 'border-transparent text-[#111111] hover:text-[#111111] hover:bg-[#FAFAFA] hover:border-[#DCDCDC]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-primary' : 'text-[#666666] group-hover:text-primary'
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="tracking-wider">{item.label}</span>
                        <span className="text-[9px] text-[#666666] font-sans font-medium">{item.sub}</span>
                      </div>
                    </div>
                    {isActive ? (
                      isNavigating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System telemetry box */}
        <div className="mx-3 my-2 p-3 rounded-[3px] bg-[#FAFAFA] border border-[#DCDCDC] font-mono text-[10px] space-y-1.5">
          <div className="flex items-center justify-between text-[#666666]">
            <span className="flex items-center gap-1.5 text-[#111111] font-bold">
              <Cpu className="w-3 h-3 text-primary" /> SCAN ENGINE
            </span>
            <span className="text-primary font-bold">READY</span>
          </div>
          <div className="w-full bg-[#E5E5E5] h-1.5 rounded-[1px] overflow-hidden">
            <div className="bg-primary h-full w-[80%]" />
          </div>
          <div className="flex justify-between text-[9px] text-[#666666] font-medium">
            <span>MEM: OPTIMAL</span>
            <span className="text-[#111111] font-bold">PROBES: ONLINE</span>
          </div>
        </div>

        {/* User profile & Sign out */}
        <div className="p-3 border-t border-[#DCDCDC] bg-white">
          <div className="flex items-center justify-between p-2 rounded-[3px] bg-[#FAFAFA] border border-[#DCDCDC]">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-[2px] bg-primary text-[#111111] border border-[#111111] flex items-center justify-center text-xs font-mono font-bold shrink-0">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'O'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-mono font-bold text-[#111111] truncate">
                  {user?.username || 'root'}
                </p>
                <p className="text-[9px] text-[#666666] font-mono truncate">OPERATOR #090</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 text-[#666666] hover:text-danger hover:bg-danger/10 rounded-[2px] transition-colors focus:outline-none"
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

export default Sidebar;
