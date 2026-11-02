import React, { useState, useEffect } from 'react';
import { Menu, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export interface HeaderProps {
  onOpenSidebar: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar, title }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toISOString().substring(11, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isDashboard = location.pathname === '/dashboard';

  return (
    <header className="h-16 bg-white border-b-2 border-[#111111] px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 text-[#111111] hover:text-primary rounded-[3px] hover:bg-[#FAFAFA] border border-[#DCDCDC] focus:outline-none transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          {/* Target / Radar Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[3px] border-2 border-[#111111] flex items-center justify-center p-0.5">
              <div className="w-3.5 h-3.5 rounded-[1px] border border-[#111111] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-tech font-bold text-sm tracking-wider text-[#111111]">
                  SUBSRECON
                </span>
              </div>
              <p className="text-[9px] text-[#666666] tracking-widest font-mono uppercase font-bold">
                ATTACK SURFACE INTELLIGENCE
              </p>
            </div>
          </div>

          {title && (
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-[#DCDCDC] font-mono text-xs">
              <span className="text-[#888888]">/</span>
              <span className="text-primary font-bold">{title}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 font-mono">
        {/* DASHBOARD Button matching screenshot */}
        {!isDashboard && (
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-[#111111] bg-white text-[#111111] hover:bg-[#FFF7ED] hover:border-primary hover:text-primary text-xs font-mono font-bold tracking-wider transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>DASHBOARD</span>
          </button>
        )}

        {/* Real-time Clock */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-[#FAFAFA] border border-[#DCDCDC] font-mono text-xs text-[#666666]">
          <span className="text-primary text-[10px] font-bold">TIME:</span>
          <span className="text-[#111111] font-bold">{timeStr}</span>
        </div>

        {/* API Engine Status indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[3px] bg-[#FAFAFA] border border-[#DCDCDC] text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-[#111111] font-bold hidden sm:inline">CORE: 9090</span>
          <span className="text-[#16A34A] text-[10px] hidden md:inline font-bold">// ONLINE</span>
        </div>

        {/* Operator badge */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#DCDCDC]">
          <div className="w-8 h-8 rounded-[3px] bg-primary text-[#111111] border border-[#111111] flex items-center justify-center text-xs font-mono font-bold">
            {user?.username ? user.username.charAt(0).toUpperCase() : 'OP'}
          </div>

          <div className="hidden md:flex flex-col">
            <span className="text-xs font-mono font-bold text-[#111111] tracking-wide leading-tight">
              {user?.username || 'root'}
            </span>
            <span className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase">
              LVL-4 CLEARANCE
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
