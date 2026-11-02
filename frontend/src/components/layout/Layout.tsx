import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Loader } from '@/components/common/Loader';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPathname = useRef(location.pathname);

  useEffect(() => {
    if (prevPathname.current !== location.pathname) {
      prevPathname.current = location.pathname;
      setIsNavigating(true);
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 260);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-dark-bg/85 text-dark-text flex relative overflow-x-hidden selection:bg-primary/30 selection:text-primary">
      {/* High-Tech Glowing Ambient Radar Orbs in the background */}
      <div className="fixed top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-1/3 w-[500px] h-[500px] bg-cyber-cyan/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Top subtle neon route progress bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[2.5px] bg-primary/10 overflow-hidden pointer-events-none">
          <div className="w-full h-full bg-gradient-to-r from-primary via-cyber-cyan to-primary shadow-[0_0_10px_#00FF88] animate-route-progress" />
        </div>
      )}

      {/* Sidebar navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isNavigating={isNavigating}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 relative z-10">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-3 sm:p-4 lg:px-6 lg:py-5 w-full mx-auto">
          {isNavigating ? (
            <div className="flex flex-col items-center justify-center py-24 text-dark-muted animate-fadeIn">
              <Loader size="md" text="Decrypting & routing view..." />
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center py-24 text-dark-muted animate-fadeIn">
                  <Loader size="md" text="Initializing HUD matrix..." />
                </div>
              }
            >
              <div className="animate-fadeIn">
                <Outlet />
              </div>
            </Suspense>
          )}
        </main>

        {/* Global Hacker Footer Status Strip */}
        <footer className="py-3 px-6 border-t border-dark-border/60 bg-dark-sidebar/40 backdrop-blur-md text-[11px] font-mono text-dark-muted flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00FF88]" />
            <span className="text-dark-text/90 font-semibold tracking-wider">SUBSRECON SOC-FEED</span>
            <span className="text-dark-muted/60">|</span>
            <span className="text-primary/90">SEC_OP//ACTIVE</span>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <span>NODE: <strong className="text-dark-text">LOCAL_CORE_9090</strong></span>
            <span>CIPHER: <strong className="text-cyber-cyan">SHA256_JWT</strong></span>
            <span className="hidden md:inline text-dark-muted/60">SYSTEM INTEGRITY: 100%</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
