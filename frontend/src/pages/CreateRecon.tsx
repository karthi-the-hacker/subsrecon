import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Globe, Mail, Building, ArrowLeft, Info, AlertCircle, Crosshair, Terminal } from 'lucide-react';
import { useCreateRecon } from '@/hooks/useRecons';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { AppError } from '@/types/api';

// Domain validation matching backend isValidDomain (includes/dbgateway.js lines 34-51)
const isValidDomainRegex = (domain: string) => {
  const trimmed = domain.trim().toLowerCase().replace(/\.$/, '');
  if (trimmed.length === 0 || trimmed.length > 253) return false;
  const labels = trimmed.split('.');
  if (labels.length < 2) return false;
  return labels.every(
    (label) =>
      label.length >= 1 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
  );
};

const createReconSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Campaign or organization name is required')
    .max(120, 'Name cannot exceed 120 characters'),
  reportTo: z
    .string()
    .trim()
    .min(1, 'Report-To email is required')
    .max(254, 'Email cannot exceed 254 characters')
    .email('Please provide a valid email address'),
  domainsInput: z
    .string()
    .trim()
    .min(1, 'At least one root domain is required')
    .superRefine((val, ctx) => {
      const parsed = val
        .split(/[\n,]+/)
        .map((d) => d.trim().toLowerCase().replace(/\.$/, ''))
        .filter(Boolean);

      if (parsed.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one root domain is required',
        });
        return;
      }

      if (parsed.length > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Backend accepts a maximum of 100 root domains per campaign',
        });
        return;
      }

      const invalidDomains = parsed.filter((d) => !isValidDomainRegex(d));
      if (invalidDomains.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid domain format: ${invalidDomains.slice(0, 3).join(', ')}${
            invalidDomains.length > 3 ? '...' : ''
          }`,
        });
        return;
      }

      const uniqueSet = new Set(parsed);
      if (uniqueSet.size !== parsed.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate root domains are not permitted',
        });
      }
    }),
});

type CreateReconFormValues = z.infer<typeof createReconSchema>;

export const CreateRecon: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateRecon();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateReconFormValues>({
    resolver: zodResolver(createReconSchema),
    defaultValues: {
      name: '',
      reportTo: '',
      domainsInput: '',
    },
  });

  const rawDomains = watch('domainsInput') || '';
  const parsedDomainCount = rawDomains
    .split(/[\n,]+/)
    .map((d) => d.trim())
    .filter(Boolean).length;

  const onSubmit = async (values: CreateReconFormValues) => {
    setServerError(null);

    const domains = values.domainsInput
      .split(/[\n,]+/)
      .map((d) => d.trim().toLowerCase().replace(/\.$/, ''))
      .filter(Boolean);

    try {
      const result = await createMutation.mutateAsync({
        name: values.name.trim(),
        reportTo: values.reportTo.trim(),
        domains,
      });

      if (result?.id) {
        navigate(`/recons/${result.id}`);
      } else {
        navigate('/recons');
      }
    } catch (err: unknown) {
      const appErr = err as AppError;
      setServerError(appErr.message || 'Failed to initialize reconnaissance campaign.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-dark-border/80">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="p-2 text-dark-muted hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-primary mb-0.5">
              <Crosshair className="w-3.5 h-3.5" />
              <span>MISSION_CONTROL // TARGET_SPECIFICATION</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-tech font-bold text-white tracking-wider uppercase">
              DEPLOY RECONNAISSANCE SCAN
            </h2>
            <p className="text-xs text-dark-muted font-mono mt-0.5">
              Specify target perimeter and queue automated multi-source Subfinder enumeration.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="cyber-panel p-6 sm:p-8 rounded-xl relative cyber-corners border border-primary/30 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {serverError && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-danger/15 border border-danger/40 flex items-start gap-3 text-xs text-danger font-mono shadow-[0_0_12px_rgba(255,42,95,0.2)]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{serverError}</span>
            </div>
          )}

          {/* Organization / Campaign Name */}
          <Input
            label="TARGET CAMPAIGN IDENTIFIER"
            placeholder="e.g. Acme Corp Attack Surface Review"
            leftIcon={<Building className="w-4 h-4 text-primary" />}
            required
            helperText="Max 120 characters defining this security review scope."
            error={errors.name?.message}
            {...register('name')}
          />

          {/* Report-to Email */}
          <Input
            label="REPORT DISPATCH EMAIL"
            type="email"
            placeholder="e.g. secops-team@target.com"
            leftIcon={<Mail className="w-4 h-4 text-primary" />}
            required
            helperText="Incident response or vulnerability triage contact address."
            error={errors.reportTo?.message}
            {...register('reportTo')}
          />

          {/* Target Root Domains */}
          <div className="space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <label
                htmlFor="domainsInput"
                className="text-xs font-semibold text-dark-text tracking-wider flex items-center gap-1.5"
              >
                <span className="text-primary">&gt;</span>
                <Globe className="w-3.5 h-3.5 text-cyber-cyan" />
                <span>ROOT SCOPE DOMAINS (1 to 100)</span>
                <span className="text-danger text-[10px]">[REQUIRED]</span>
              </label>
              <span className="text-[11px] text-cyber-cyan font-bold bg-dark-bg/80 px-2 py-0.5 rounded border border-dark-border">
                {parsedDomainCount} / 100 DOMAINS
              </span>
            </div>

            <textarea
              id="domainsInput"
              rows={6}
              placeholder={`acme.com\napi-acme.com\nacmecorp.io`}
              className={`w-full rounded-lg bg-dark-bg/90 border text-xs sm:text-sm font-mono text-dark-text placeholder:text-dark-muted/40 p-3.5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:shadow-[0_0_15px_rgba(0,255,136,0.25)] backdrop-blur-md disabled:opacity-50 ${
                errors.domainsInput ? 'border-danger focus:ring-danger' : 'border-dark-border/80 hover:border-dark-border-bright'
              }`}
              {...register('domainsInput')}
            />

            {errors.domainsInput ? (
              <p className="text-xs text-danger font-medium flex items-center gap-1" role="alert">
                <span>[!]</span> {errors.domainsInput.message}
              </p>
            ) : (
              <p className="text-[11px] text-dark-muted/80 flex items-center gap-1.5 font-sans">
                <Info className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span>Enter one root FQDN per line or separated by commas (e.g. domain.com).</span>
              </p>
            )}
          </div>

          <div className="p-4 rounded-lg bg-dark-bg/80 border border-primary/20 text-xs font-mono text-dark-muted space-y-1.5">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Terminal className="w-3.5 h-3.5" />
              <span>SCAN PIPELINE PROTOCOL</span>
            </div>
            <p className="font-sans text-[11px] text-dark-muted leading-relaxed">
              When dispatched, the backend engine initializes Subfinder in an asynchronous worker thread.
              Live assets will stream directly into the target intelligence telemetry as they resolve.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-border/80 font-mono">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => navigate('/recons')}
              disabled={isSubmitting || createMutation.isPending}
            >
              ABORT
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting || createMutation.isPending}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              DEPLOY PIPELINE
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateRecon;
