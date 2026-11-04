export type ToolStatus = 'INSTALLED' | 'MISSING' | 'OUTDATED' | 'ERROR' | 'DISABLED';

export type ToolHealth = 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';

export interface InstallationMethod {
  type: string;
  command: string;
  description?: string;
}

export interface SecurityTool {
  id: string;
  name: string;
  description: string;
  category: string;
  installed: boolean;
  status: ToolStatus;
  health: ToolHealth;
  version: string | null;
  executable: string | null;
  executable_name?: string | null;
  installation_source: string | null;
  documentation_url: string;
  installation_command: string;
  installation_methods: InstallationMethod[];
  supported_platforms: string[];
  input_type: string;
  enabled: boolean;
  last_checked_at: string | null;
  message?: string;
  is_custom?: boolean;
  is_cve?: boolean;
}

export interface CreateToolPayload {
  name: string;
  category?: string;
  description?: string;
  executable_name?: string;
  installation_command?: string;
  input_type?: string;
}

export interface ToolCategory {
  id: string;
  name: string;
  description?: string;
  total: number;
  installed: number;
  missing: number;
}

export interface ToolStats {
  total: number;
  installed: number;
  missing: number;
  outdated: number;
  healthy: number;
  unhealthy: number;
  disabled?: number;
  last_detection_at?: string | null;
}

export interface DetectionResult {
  tools: SecurityTool[];
  stats: ToolStats;
}

export interface DetectionHistoryEntry {
  id: string;
  timestamp: string;
  total: number;
  installed: number;
  missing: number;
  healthy: number;
  unhealthy: number;
  duration_ms: number;
}

export interface ToolHealthCheckResult {
  id: string;
  name?: string;
  category?: string;
  installed: boolean;
  status: ToolStatus;
  health: ToolHealth;
  version: string | null;
  executable: string | null;
  installation_source?: string;
  latency_ms?: number;
  error?: string | null;
}

export type StatusFilter = 'ALL' | 'INSTALLED' | 'MISSING' | 'OUTDATED' | 'UNHEALTHY' | 'ENABLED' | 'DISABLED';
