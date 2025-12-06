export type Language = "curl" | "python" | "node";

export interface ApiEndpoint {
  id: string;
  name: string;
  method: string;
  path: string;
  description: string;
  auth: boolean;
  requestBody?: {
    [key: string]: {
      type: string;
      required: boolean;
      description: string;
    };
  };
  requestHeaders?: {
    [key: string]: {
      type: string;
      required: boolean;
      description: string;
    };
  };
  response: {
    [key: string]: string;
  };
  examples: {
    curl: string;
    python: string;
    node: string;
  };
  responseExample: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  comingSoon?: boolean;
  endpoints: ApiEndpoint[];
}

