import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, AlertCircle, Radar, Terminal, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { AppError } from '@/types/api';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const appErr = err as AppError;
      setServerError(appErr.message || 'Access Denied: Invalid operator credentials.');
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-primary/30 selection:text-primary overflow-hidden">
      {/* Background radial spotlights */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-10 right-1/4 w-[400px] h-[400px] bg-cyber-cyan/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Cyberpunk Classification Bar */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-4 relative z-10 font-mono">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-[11px] text-primary mb-3 shadow-[0_0_15px_rgba(0,255,136,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
          <span>CLASSIFIED // LEVEL-4 OPERATOR ACCESS</span>
        </div>

        <div className="flex justify-center mb-3">
          <div className="relative">
            {/* Spinning holographic ring */}
            <div className="absolute -inset-2 rounded-2xl border border-primary/40 animate-pulse pointer-events-none" />
            <div className="w-16 h-16 rounded-2xl bg-dark-card/90 border border-primary/60 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(0,255,136,0.35)]">
              <Radar className="w-9 h-9 text-primary animate-radar-sweep" />
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-extrabold font-tech tracking-wider text-white neon-text-green uppercase">
          SUBSRECON
        </h2>
        <p className="mt-1 text-xs text-cyber-cyan font-mono tracking-widest uppercase">
          &gt; TACTICAL ATTACK SURFACE RADAR &amp; RECON ENGINE
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="cyber-panel-glow py-8 px-6 sm:px-10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative cyber-corners border border-primary/40">
          {/* Header watermark */}
          <div className="flex items-center justify-between pb-4 border-b border-dark-border/80 mb-6 font-mono text-[10px] text-dark-muted">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-primary" /> CONSOLE_AUTH_V1
            </span>
            <span className="text-primary font-bold">PORT: 9090 // ACTIVE</span>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-danger/15 border border-danger/50 flex items-start gap-2.5 text-xs text-danger font-mono shadow-[0_0_15px_rgba(255,42,95,0.2)]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{serverError}</span>
              </div>
            )}

            <Input
              label="OPERATOR IDENTIFIER"
              type="text"
              autoComplete="username"
              placeholder="e.g. root or cappriciosec"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.username?.message}
              {...register('username')}
            />

            <Input
              label="ACCESS PASSCODE"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-dark-muted hover:text-primary transition-colors focus:outline-none p-1"
                  aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full shadow-[0_0_20px_rgba(0,255,136,0.4)]"
                isLoading={isSubmitting}
                leftIcon={<KeyRound className="w-4 h-4" />}
              >
                AUTHENTICATE SESSION
              </Button>
            </div>
          </form>

          {/* Console security notice */}
          <div className="mt-6 pt-4 border-t border-dark-border/80 text-center font-mono">
            <p className="text-[10px] text-dark-muted/80">
              SECURED VIA JWT // SHA-256 SESSION HASH
            </p>
            <p className="text-[9px] text-primary/60 mt-1">
              AUTHORIZED SECURITY RESEARCHERS &amp; OPERATORS ONLY
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
