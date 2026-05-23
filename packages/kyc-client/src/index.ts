export interface KycRecord {
  userId: string;
  provider: 'persona' | 'onfido';
  externalId: string;
  decision: 'pending' | 'approved' | 'declined';
  tier: 1 | 2;
  decidedAt?: string;
}

export interface KycState {
  userId: string;
  kycTier: 0 | 1 | 2;
  verifiedAt?: string;
  records: KycRecord[];
}

export interface KycClientConfig {
  baseUrl: string;
  serviceToken?: string;
  fetchImpl?: typeof fetch;
}

export class KycClient {
  private readonly baseUrl: string;
  private readonly serviceToken?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: KycClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.serviceToken = config.serviceToken;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async initTier1(input: {
    userId: string;
    phone: string;
    country: string;
  }): Promise<{ inquiryId: string; redirectUrl: string }> {
    return this.post('/kyc/tier1/init', input);
  }

  async initTier2(input: {
    userId: string;
    documentType: 'passport' | 'national_id' | 'driving_license';
    country: string;
  }): Promise<{ checkId: string; redirectUrl: string }> {
    return this.post('/kyc/tier2/init', input);
  }

  async getState(userId: string): Promise<KycState> {
    return this.get(`/kyc/users/${encodeURIComponent(userId)}/state`);
  }

  private async get<T>(path: string): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: this.authHeaders(),
    });
    if (!res.ok)
      throw new KycClientError(`GET ${path} → ${res.status}`, res.status);
    return (await res.json()) as T;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok)
      throw new KycClientError(`POST ${path} → ${res.status}`, res.status);
    return (await res.json()) as T;
  }

  private authHeaders(): Record<string, string> {
    return this.serviceToken
      ? { authorization: `Bearer ${this.serviceToken}` }
      : {};
  }
}

export class KycClientError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'KycClientError';
  }
}
