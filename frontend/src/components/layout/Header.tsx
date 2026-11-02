import React, { useState, useEffect } from 'react';
import { Menu, Terminal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export interface HeaderProps {
  onOpenSidebar: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar, title }) => {
  const { user } = useAuth();
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

  return (
    <header className="h-16 bg-dark-sidebar/70 backdrop-blur-xl border-b border-dark-border/80 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 text-dark-muted hover:text-primary rounded-lg hover:bg-dark-card/80 border border-dark-border/60 focus:outline-none transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 font-mono">
          <Terminal className="w-4 h-4 text-primary animate-pulse hidden sm:inline" />
          <span className="text-primary/70 text-xs hidden sm:inline">&gt;</span>
          <h1 className="text-xs sm:text-sm font-bold tracking-wider text-dark-text uppercase font-mono">
            {title ? (
              <span className="flex items-center gap-2">
                <span className="text-dark-muted font-normal">ROOT //</span>
                <span className="text-primary neon-text-green">{title}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-dark-muted font-normal">SEC_OPS //</span>
                <span className="text-primary">ATTACK_SURFACE_RADAR</span>
              </span>
            )}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Real-time Clock HUD */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-md bg-dark-card/70 border border-dark-border font-mono text-xs text-dark-muted">
          <span className="text-cyber-cyan text-[10px]">TIME:</span>
          <span className="text-dark-text font-semibold">{timeStr}</span>
        </div>

        {/* API Engine Status indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-dark-card/90 border border-primary/20 text-xs font-mono shadow-[0_0_12px_rgba(0,255,136,0.08)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-primary font-semibold hidden sm:inline">CORE: 9090</span>
          <span className="text-emerald-400/80 text-[10px] hidden md:inline">// ONLINE</span>
        </div>

        {/* Operator badge */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-dark-border/80">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center text-xs font-mono font-bold text-primary shadow-[0_0_12px_rgba(0,255,136,0.15)]">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'OP'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyber-cyan border border-dark-bg" />
          </div>

          <div className="hidden md:flex flex-col">
            <span className="text-xs font-mono font-bold text-dark-text tracking-wide leading-tight">
              {user?.username || 'root'}
            </span>
            <span className="text-[10px] font-mono text-primary/70 tracking-widest uppercase">
              LVL-4 CLEARANCE
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
