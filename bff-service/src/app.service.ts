import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { ProxyResponse, QueryParams, RequestHeaders } from './types';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getRecipientURL(serviceName: string): string | undefined {
    return this.configService.get(serviceName.toUpperCase());
  }

  async proxyRequest(
    url: string,
    method: string,
    headers: RequestHeaders,
    query: QueryParams,
    body: unknown,
  ): Promise<ProxyResponse> {
    try {
      const sanitizedHeaders = { ...headers };
      delete sanitizedHeaders.host;
      delete sanitizedHeaders.connection;
      delete sanitizedHeaders['content-length'];

      const response = await axios({
        url,
        method,
        headers: sanitizedHeaders,
        params: query,
        data: body,
        validateStatus: null,
        // Disable SSL verification for local development
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false,
        }),
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        throw new HttpException(
          axiosError.response.data || 'Service error',
          axiosError.response.status || 502,
        );
      }
      throw new HttpException('Cannot process request', 502);
    }
  }
}
