export type EzStackClientOptions = {
  baseUrl?: string;
  apiKey: string;
  projectName?: string;
  userAgentSuffix?: string;
};

export class EzStackError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "EzStackError";
    this.status = status;
  }
}

type JsonRecord = Record<string, unknown> | undefined;

class HttpClient {
  private baseUrl: string;
  private apiKey: string;
  private initialized: boolean = false;

  constructor(opts: EzStackClientOptions) {
    this.baseUrl = (opts.baseUrl ?? "http://ezstack.app").replace(/\/$/, "");
    this.apiKey = opts.apiKey;
  }

  async validateConnection(): Promise<void> {
    const res = await this.get<{ ok: boolean }>("/api/v1/apiKeys/is-valid");
    if (!res?.ok) {
      throw new EzStackError("Failed to connect to EzStack API", 500);
    }

    this.initialized = true;
  }

  private buildHeaders(extra?: Record<string, string>): HeadersInit {
    if (!this.initialized) {
      throw new EzStackError("Not initialized", 500);
    }
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "eza-api-key": this.apiKey,
      ...(extra ?? {}),
    };
    return headers;
  }

  async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    if (!this.initialized) {
      throw new EzStackError("Not initialized", 500);
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: this.buildHeaders(headers),
    });
    return this.handle<T>(res);
  }

  async post<T>(
    path: string,
    body?: JsonRecord,
    headers?: Record<string, string>
  ): Promise<T> {
    if (!this.initialized) {
      throw new EzStackError("Not initialized", 500);
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.buildHeaders(headers),
      body: JSON.stringify(body ?? {}),
    });
    return this.handle<T>(res);
  }

  private async handle<T>(res: Response): Promise<T> {
    if (!this.initialized) {
      throw new EzStackError("Not initialized", 500);
    }
    const text = await res.text();
    let data: unknown = undefined;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {}
    if (!res.ok) {
      const message =
        (data as any)?.error?.message ||
        (typeof text === "string" && text) ||
        `Request failed (${res.status})`;
      throw new EzStackError(message, res.status);
    }
    return data as T;
  }
}

// Types
export interface SendOtpRequest {
  destination: string;
  channel: "sms";
  contextDescription?: string;
  [key: string]: unknown;
}
export interface SendOtpResponse {
  requestId: string;
}
export interface VerifyOtpRequest {
  requestId: string;
  code: string;
}
export interface VerifyOtpResponse {
  verified: boolean;
  error?: string;
}

class EzAuthOtpResource {
  constructor(private http: HttpClient) {}
  send(input: SendOtpRequest) {
    return this.http.post<SendOtpResponse>("/api/v1/ezauth/otp/send", input);
  }
  verify(input: VerifyOtpRequest) {
    const { requestId, code } = input;
    return this.http.get<VerifyOtpResponse>(
      `/api/v1/ezauth/otp/verify/${encodeURIComponent(
        requestId
      )}/${encodeURIComponent(code)}`
    );
  }
}

export default class EzStack {
  public ezauth: { otp: EzAuthOtpResource };

  constructor(options: EzStackClientOptions, httpClient?: HttpClient) {
    const http = httpClient ?? new HttpClient(options);
    this.ezauth = { otp: new EzAuthOtpResource(http) };
  }

  static async create(options: EzStackClientOptions): Promise<EzStack> {
    const http = new HttpClient(options);
    await http.validateConnection();
    return new EzStack(options, http);
  }
}
