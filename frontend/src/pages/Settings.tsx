import React, { useState, useEffect } from 'react';
import { Shield, Server, User, CheckCircle2, XCircle, LogOut, Terminal, Cpu, KeyRound, Radio } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { checkHealth } from '@/api/subsrecon';
import { API_BASE_URL } from '@/api/client';
import { Button } from '@/components/common/Button';

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [backendMessage, setBackendMessage] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    checkHealth()
      .then((res) => {
        if (mounted) {
          setBackendStatus('online');
          setBackendMessage(res.message || 'SubsRecon API engine online');
        }
      })
      .catch((err) => {
        if (mounted) {
          setBackendStatus('offline');
          setBackendMessage(err.message || 'Unable to connect to backend engine');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-dark-border/80">
        <div className="flex items-center gap-2 font-mono text-xs text-primary mb-1">
          <Cpu className="w-3.5 h-3.5 text-primary" />
          <span>SYSTEM_CONFIGURATION // NODE_CONTROL</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-tech font-bold text-white tracking-wider uppercase">
          SYSTEM &amp; ACCOUNT CONFIGURATION
        </h2>
        <p className="text-xs text-dark-muted font-mono mt-0.5">
          Inspect active operator clearance, backend service endpoints, and architectural parameters.
        </p>
      </div>

      {/* Active Session & Operator Card */}
      <div className="cyber-panel p-6 sm:p-7 rounded-xl space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative cyber-corners">
        <div className="flex items-center gap-2.5 pb-3 border-b border-dark-border/80 font-mono">
          <User className="w-4 h-4 text-primary" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            &gt; ACTIVE OPERATOR PROFILE
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-dark-bg/90 rounded-lg border border-dark-border space-y-1.5">
            <span className="text-dark-muted font-bold block text-[11px] text-primary">
              // OPERATOR IDENTITY:
            </span>
            <p className="text-white font-bold text-sm tracking-wide">{user?.username || 'NOT SIGNED IN'}</p>
            <p className="text-[11px] text-dark-muted font-sans">
              Configured securely in <code className="text-primary font-mono">~/db/maindb.json</code>
            </p>
          </div>

          <div className="p-4 bg-dark-bg/90 rounded-lg border border-dark-border space-y-1.5">
            <span className="text-dark-muted font-bold block text-[11px] text-cyber-cyan">
              // AUTHENTICATION PROTOCOL:
            </span>
            <p className="text-dark-text font-bold">TYPE: BEARER JWT (RS256)</p>
            <p className="text-[11px] text-dark-muted font-sans">Lifetime: 2 Hours per authenticated session</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end font-mono">
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            leftIcon={<LogOut className="w-3.5 h-3.5 text-danger" />}
            className="hover:border-danger hover:text-danger"
          >
            TERMINATE OPERATOR SESSION
          </Button>
        </div>
      </div>

      {/* Backend Engine Connectivity */}
      <div className="cyber-panel p-6 sm:p-7 rounded-xl space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative cyber-corners">
        <div className="flex items-center gap-2.5 pb-3 border-b border-dark-border/80 font-mono">
          <Server className="w-4 h-4 text-cyber-cyan" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            &gt; BACKEND SERVICE NODE TELEMETRY
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-dark-bg/90 rounded-lg border border-dark-border space-y-1.5">
            <span className="text-dark-muted font-bold block text-[11px] text-primary">
              // ENDPOINT TARGET URL:
            </span>
            <p className="text-dark-text text-sm font-bold">{API_BASE_URL}</p>
            <p className="text-[11px] text-dark-muted font-sans">Node.js Express + LowDB Engine (Port 9090)</p>
          </div>

          <div className="p-4 bg-dark-bg/90 rounded-lg border border-dark-border space-y-1.5">
            <span className="text-dark-muted font-bold block text-[11px] text-cyber-cyan">
              // HEALTH CHECK TELEMETRY:
            </span>
            <div className="flex items-center gap-2">
              {backendStatus === 'online' ? (
                <span className="flex items-center gap-1.5 text-primary font-bold neon-text-green">
                  <CheckCircle2 className="w-4 h-4" />
                  NODE ONLINE &amp; RESPONSIVE
                </span>
              ) : backendStatus === 'offline' ? (
                <span className="flex items-center gap-1.5 text-danger font-bold neon-text-crimson">
                  <XCircle className="w-4 h-4" />
                  SERVICE UNREACHABLE
                </span>
              ) : (
                <span className="text-dark-muted">PINGING ENGINE CORE...</span>
              )}
            </div>
            {backendMessage && <p className="text-[11px] text-dark-muted">{backendMessage}</p>}
          </div>
        </div>
      </div>

      {/* Explicit Unsupported Features Section */}
      <div className="cyber-panel p-6 sm:p-7 rounded-xl space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative cyber-corners">
        <div className="flex items-center gap-2.5 pb-3 border-b border-dark-border/80 font-mono">
          <Shield className="w-4 h-4 text-warning" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            &gt; ARCHITECTURAL PROTOCOLS &amp; BACKEND SPECIFICATIONS
          </h3>
        </div>

        <p className="text-xs text-dark-muted font-sans leading-relaxed">
          The following parameters define the operational boundaries of the local SubsRecon node:
        </p>

        <ul className="space-y-3 text-xs text-dark-muted font-mono">
          <li className="flex items-start gap-3 bg-dark-bg/90 p-3.5 rounded-lg border border-dark-border">
            <Terminal className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="font-sans">
              <strong className="text-white font-mono">Identity Management:</strong> Passwords and operator profiles are managed on the filesystem.
              Updates must be made directly in <code className="text-primary font-mono">~/db/maindb.json</code>.
            </div>
          </li>

          <li className="flex items-start gap-3 bg-dark-bg/90 p-3.5 rounded-lg border border-dark-border">
            <Radio className="w-4 h-4 text-cyber-cyan shrink-0 mt-0.5" />
            <div className="font-sans">
              <strong className="text-white font-mono">Asynchronous Runner:</strong> Subfinder subprocesses run in background daemon threads and cannot be interrupted mid-flight.
            </div>
          </li>

          <li className="flex items-start gap-3 bg-dark-bg/90 p-3.5 rounded-lg border border-dark-border">
            <KeyRound className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="font-sans">
              <strong className="text-white font-mono">Session TTL:</strong> Authentication tokens expire strictly after 120 minutes with zero sliding token renewal.
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};
export default Settings;
