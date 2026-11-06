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
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#111111] flex relative overflow-x-hidden">
      {/* Top subtle orange route progress bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-[#DCDCDC] overflow-hidden pointer-events-none">
          <div className="w-full h-full bg-primary" />
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

        <main className="flex-1 p-4 sm:p-5 lg:p-6 w-full mx-auto">
          {isNavigating ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#666666] animate-fadeIn">
              <Loader size="md" text="Routing view..." />
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center py-24 text-[#666666] animate-fadeIn">
                  <Loader size="md" text="Initializing view..." />
                </div>
              }
            >
              <div className="animate-fadeIn">
                <Outlet />
              </div>
            </Suspense>
          )}
        </main>

        {/* Global Footer Status Strip */}
        <footer className="py-2.5 px-6 border-t border-[#DCDCDC] bg-white text-[11px] font-mono text-[#666666] flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[#111111] font-bold tracking-wider">SUBSRECON SOC-FEED</span>
            <span className="text-[#DCDCDC]">|</span>
            <span className="text-primary font-bold">SEC_OP//ACTIVE</span>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <span>NODE: <strong className="text-[#111111]">LOCAL_CORE_9090</strong></span>
            <span>CIPHER: <strong className="text-[#111111]">SHA256_JWT</strong></span>
            <span className="hidden md:inline text-[#666666]">SYSTEM INTEGRITY: <strong className="text-[#16A34A]">100%</strong></span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
