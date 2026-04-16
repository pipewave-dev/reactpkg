export interface PipewaveModuleConfigProps {
  backendEndpoint: string;
  enableLongPollingFallback?: boolean;
  insecure?: boolean;
  getAccessToken: () => Promise<string>;
  getInstanceID?: () => Promise<string>;
  retry?: RetryConfig;
  heartbeatInterval?: number;
  additionalHeaders?: () => Promise<Record<string, string>>;
}

export interface RetryConfig {
  maxRetry: number;
  initialRetryDelay: number;
  maxRetryDelay: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetry: 3,
  initialRetryDelay: 1000,
  maxRetryDelay: 5000,
};

export class PipewaveModuleConfig {
  backendEndpoint: string;
  enableLongPollingFallback: boolean;
  insecure: boolean;
  getAccessToken: () => Promise<string>;
  getInstanceID?: () => Promise<string>;
  retry: RetryConfig = DEFAULT_RETRY_CONFIG;
  heartbeatInterval: number = 30000;
  additionalHeaders?: () => Promise<Record<string, string>>;

  constructor({
    backendEndpoint,
    enableLongPollingFallback,
    insecure,
    getAccessToken,
    retry,
    heartbeatInterval,
    additionalHeaders,
    getInstanceID,
  }: PipewaveModuleConfigProps) {
    this.backendEndpoint = backendEndpoint;
    this.enableLongPollingFallback = enableLongPollingFallback ?? true;
    this.insecure = insecure ?? false;
    this.getAccessToken = getAccessToken;
    this.getInstanceID = getInstanceID;
    this.retry = retry ?? DEFAULT_RETRY_CONFIG;
    this.heartbeatInterval = heartbeatInterval ?? 30000;
    this.additionalHeaders = additionalHeaders;
  }
}

export type PipewaveConfigInput =
  | PipewaveModuleConfig
  | PipewaveModuleConfigProps;

export function toPipewaveModuleConfig(
  config: PipewaveConfigInput,
): PipewaveModuleConfig {
  return config instanceof PipewaveModuleConfig
    ? config
    : new PipewaveModuleConfig(config);
}
