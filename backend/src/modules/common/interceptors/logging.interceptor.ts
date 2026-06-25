import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const correlationId = request.headers['x-correlation-id'] || uuidv4();
    request.correlationId = correlationId;

    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const delay = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${response.statusCode} ${delay}ms - ${ip} - ${userAgent} [${correlationId}]`,
          );
        },
        error: (err) => {
          const delay = Date.now() - start;
          this.logger.error(
            `${method} ${url} ${err.status || 500} ${delay}ms - ${ip} [${correlationId}]`,
          );
        },
      }),
    );
  }
}
