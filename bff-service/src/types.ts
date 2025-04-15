export interface RequestHeaders {
  [key: string]: string | string[] | undefined;
  host?: string;
  connection?: string;
  'content-length'?: string;
}

export interface QueryParams {
  [key: string]: string | string[] | undefined;
}

export interface ProxyRequest {
  method: string;
  headers: RequestHeaders;
  query: QueryParams;
  body: unknown;
  path: string;
}

export interface ProxyResponse {
  data: unknown;
  headers?: Record<string, string>;
  status?: number;
}
