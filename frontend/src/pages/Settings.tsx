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
      <div className="pb-4 border-b border-[#DCDCDC]">
        <div className="flex items-center gap-2 font-mono text-xs text-primary mb-1">
          <Cpu className="w-3.5 h-3.5 text-primary" />
          <span className="font-bold">SYSTEM_CONFIGURATION // NODE_CONTROL</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight uppercase">
          SYSTEM &amp; ACCOUNT CONFIGURATION
        </h2>
        <p className="text-xs text-[#666666] font-mono mt-0.5">
          Inspect active operator clearance, backend service endpoints, and architectural parameters.
        </p>
      </div>

      {/* Active Session & Operator Card */}
      <div className="bg-white border border-[#DCDCDC] p-6 sm:p-7 rounded-[3px] space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCDCDC] font-mono">
          <User className="w-4 h-4 text-primary" />
          <h3 className="text-xs sm:text-sm font-bold text-[#111111] uppercase tracking-wider">
            &gt; ACTIVE OPERATOR PROFILE
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-[#FAFAFA] rounded-[3px] border border-[#DCDCDC] space-y-1.5">
            <span className="font-bold block text-[11px] text-primary">
              // OPERATOR IDENTITY:
            </span>
            <p className="text-[#111111] font-bold text-sm tracking-wide">{user?.username || 'NOT SIGNED IN'}</p>
            <p className="text-[11px] text-[#666666] font-sans">
              Configured securely in <code className="text-primary font-mono font-bold">~/db/maindb.json</code>
            </p>
          </div>

          <div className="p-4 bg-[#FAFAFA] rounded-[3px] border border-[#DCDCDC] space-y-1.5">
            <span className="font-bold block text-[11px] text-primary">
              // AUTHENTICATION PROTOCOL:
            </span>
            <p className="text-[#111111] font-bold">TYPE: BEARER JWT (RS256)</p>
            <p className="text-[11px] text-[#666666] font-sans">Lifetime: 2 Hours per authenticated session</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end font-mono">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => logout()}
            leftIcon={<LogOut className="w-3.5 h-3.5 text-danger" />}
            className="hover:border-danger hover:text-danger hover:bg-danger-light"
          >
            TERMINATE OPERATOR SESSION
          </Button>
        </div>
      </div>

      {/* Backend Engine Connectivity */}
      <div className="bg-white border border-[#DCDCDC] p-6 sm:p-7 rounded-[3px] space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCDCDC] font-mono">
          <Server className="w-4 h-4 text-primary" />
          <h3 className="text-xs sm:text-sm font-bold text-[#111111] uppercase tracking-wider">
            &gt; BACKEND SERVICE NODE TELEMETRY
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-[#FAFAFA] rounded-[3px] border border-[#DCDCDC] space-y-1.5">
            <span className="font-bold block text-[11px] text-primary">
              // ENDPOINT TARGET URL:
            </span>
            <p className="text-[#111111] text-sm font-bold">{API_BASE_URL}</p>
            <p className="text-[11px] text-[#666666] font-sans">Node.js Express + LowDB Engine (Port 9090)</p>
          </div>

          <div className="p-4 bg-[#FAFAFA] rounded-[3px] border border-[#DCDCDC] space-y-1.5">
            <span className="font-bold block text-[11px] text-primary">
              // HEALTH CHECK TELEMETRY:
            </span>
            <div className="flex items-center gap-2">
              {backendStatus === 'online' ? (
                <span className="flex items-center gap-1.5 text-success font-bold">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  NODE ONLINE &amp; RESPONSIVE
                </span>
              ) : backendStatus === 'offline' ? (
                <span className="flex items-center gap-1.5 text-danger font-bold">
                  <XCircle className="w-4 h-4 text-danger" />
                  SERVICE UNREACHABLE
                </span>
              ) : (
                <span className="text-[#666666]">PINGING ENGINE CORE...</span>
              )}
            </div>
            {backendMessage && <p className="text-[11px] text-[#666666]">{backendMessage}</p>}
          </div>
        </div>
      </div>

      {/* Architectural Protocols Section */}
      <div className="bg-white border border-[#DCDCDC] p-6 sm:p-7 rounded-[3px] space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCDCDC] font-mono">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-xs sm:text-sm font-bold text-[#111111] uppercase tracking-wider">
            &gt; ARCHITECTURAL PROTOCOLS &amp; BACKEND SPECIFICATIONS
          </h3>
        </div>

        <p className="text-xs text-[#666666] font-sans leading-relaxed">
          The following parameters define the operational boundaries of the local SubsRecon node:
        </p>

        <ul className="space-y-3 text-xs text-[#666666] font-mono">
          <li className="flex items-start gap-3 bg-[#FAFAFA] p-3.5 rounded-[3px] border border-[#DCDCDC]">
            <Terminal className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="font-sans">
              <strong className="text-[#111111] font-mono">Identity Management:</strong> Passwords and operator profiles are managed on the filesystem.
              Updates must be made directly in <code className="text-primary font-mono font-bold">~/db/maindb.json</code>.
            </div>
          </li>

          <li className="flex items-start gap-3 bg-[#FAFAFA] p-3.5 rounded-[3px] border border-[#DCDCDC]">
            <Radio className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="font-sans">
              <strong className="text-[#111111] font-mono">Asynchronous Runner:</strong> Subfinder subprocesses run in background daemon threads and cannot be interrupted mid-flight.
            </div>
          </li>

          <li className="flex items-start gap-3 bg-[#FAFAFA] p-3.5 rounded-[3px] border border-[#DCDCDC]">
            <KeyRound className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="font-sans">
              <strong className="text-[#111111] font-mono">Session TTL:</strong> Authentication tokens expire strictly after 120 minutes with zero sliding token renewal.
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Settings;
