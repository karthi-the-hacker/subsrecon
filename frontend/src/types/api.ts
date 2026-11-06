export type ReconStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type DomainStatus = 'new' | 'pending' | 'success';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponseData {
  username: string;
  token: string;
  tokenType: string;
  expiresIn: string;
}

export interface ReconSummary {
  id: string;
  name: string;
  reportTo: string;
  domains: string[];
  database: string;
  status: ReconStatus;
  domainCount: number;
  subdomainCount: number;
  createdAt: string;
  lastUsedAt: string;
  completedAt: string | null;
}

export interface ReconListResponseData {
  total: number;
  recons: ReconSummary[];
}

export interface CreateReconRequest {
  name: string;
  reportTo: string;
  domains: string[];
}

export interface CreateReconResponseData {
  id: string;
  name: string;
  reportTo: string;
  domains: string[];
  database: string;
  status: ReconStatus;
  domainCount: number;
  subdomainCount: number;
  createdAt: string;
  lastUsedAt: string;
}

export interface SubdomainEntry {
  hostname: string;
  rootDomain?: string;
  parent?: string | null;
  depth?: number | null;
  source?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  type?: string;
  status?: DomainStatus | string;
  discoveredAt?: string;
}

export interface ReconRelationship {
  parent: string;
  child: string;
  type?: string;
}

export interface ReconScanMetadata {
  startedAt: string | null;
  completedAt: string | null;
  errors: string[];
}

export interface ReconDetail extends ReconSummary {
  scan: ReconScanMetadata;
  subdomains: SubdomainEntry[];
  relationships: ReconRelationship[];
  domainStatuses?: Record<string, DomainStatus>;
}

export interface DeleteReconResponseData {
  id: string;
  deleted: boolean;
}

export interface HuntSubdomainsRequest {
  hostname: string;
}

export interface HuntSubdomainsResponseData {
  parent: string;
  discovered: string[];
  count: number;
}

export interface UpdateDomainStatusRequest {
  hostname: string;
  status: DomainStatus;
}

export interface UpdateDomainStatusResponseData {
  hostname: string;
  status: DomainStatus;
}

export type ErrorType =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'SERVER_ERROR'
  | 'PARSE_ERROR'
  | 'UNKNOWN';

export interface AppError {
  type: ErrorType;
  message: string;
  status?: number;
  originalError?: unknown;
}
