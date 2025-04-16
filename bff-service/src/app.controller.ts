import { All, Controller, Req, HttpException, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ProxyRequest } from './types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  healthCheck(): { status: string } {
    return { status: 'ok' };
  }

  @All('*')
  async handleRequest(@Req() request: ProxyRequest) {
    try {
      const pathSegments = request.path
        .split('/')
        .filter((segment) => segment.length > 0);

      if (pathSegments.length < 1) {
        throw new HttpException(
          'Invalid request: service name is required',
          400,
        );
      }

      const serviceName = pathSegments[0];
      const recipientURL = this.appService.getRecipientURL(serviceName);

      if (!recipientURL) {
        throw new HttpException('Cannot process request', 502);
      }

      const remainingPath = pathSegments.slice(1).join('/');
      const fullRecipientURL = remainingPath
        ? `${recipientURL}/${remainingPath}`
        : recipientURL;

      if (serviceName === 'products' && request.method === 'GET') {
        return await this.appService.cashProducts(
          fullRecipientURL,
          request.method,
          request.headers,
          request.query,
          request.body,
        );
      } else {
        return await this.appService.proxyRequest(
          fullRecipientURL,
          request.method,
          request.headers,
          request.query,
          request.body,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', 500);
    }
  }
}
