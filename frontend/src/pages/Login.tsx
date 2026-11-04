import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, AlertCircle, Radar, Terminal, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSEO } from '@/hooks/useSEO';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { AppError } from '@/types/api';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  useSEO({
    title: 'Operator Login',
    description: 'Sign in to access the SubsRecon tactical reconnaissance dashboard and manage attack surface campaigns.',
  });

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
    <div className="min-h-screen bg-[#F5F5F5] relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-primary selection:text-[#111111]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6 relative z-10 font-mono">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[2px] bg-[#FFF7ED] border border-primary text-[11px] text-primary font-bold mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>CLASSIFIED // LEVEL-4 OPERATOR ACCESS</span>
        </div>

        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-[3px] bg-white border-2 border-[#111111] flex items-center justify-center text-primary shadow-sm">
            <Radar className="w-8 h-8 text-primary animate-radar-sweep" />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold font-tech tracking-wider text-[#111111] uppercase">
          SUBSRECON
        </h2>
        <p className="mt-1 text-xs text-[#666666] font-mono tracking-widest uppercase font-bold">
          &gt; ATTACK SURFACE INTELLIGENCE
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-[3px] shadow-sm border border-[#DCDCDC]">
          <div className="flex items-center justify-between pb-4 border-b border-[#DCDCDC] mb-6 font-mono text-[10px] text-[#666666]">
            <span className="flex items-center gap-1.5 font-bold text-[#111111]">
              <Terminal className="w-3.5 h-3.5 text-primary" /> CONSOLE_AUTH_V1
            </span>
            <span className="text-primary font-bold">PORT: 9090 // ACTIVE</span>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && (
              <div
                role="alert"
                className="p-3.5 rounded-[2px] bg-danger-light border border-danger/40 flex items-start gap-2.5 text-xs text-danger font-mono"
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
                  className="text-[#666666] hover:text-[#111111] transition-colors focus:outline-none p-1"
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
                className="w-full"
                isLoading={isSubmitting}
                leftIcon={<KeyRound className="w-4 h-4 text-[#111111]" />}
              >
                AUTHENTICATE SESSION
              </Button>
            </div>
          </form>

          {/* Console security notice */}
          <div className="mt-6 pt-4 border-t border-[#DCDCDC] text-center font-mono">
            <p className="text-[10px] text-[#666666] font-bold">
              SECURED VIA JWT // SHA-256 SESSION HASH
            </p>
            <p className="text-[10px] text-[#888888] mt-1 font-medium">
              AUTHORIZED SECURITY RESEARCHERS ONLY
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
