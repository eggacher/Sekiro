import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { DataScopeService } from "../services/data-scope.service";

@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  constructor(private readonly dataScopeService: DataScopeService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    if (userId) {
      request.dataScope = await this.dataScopeService.calculateScope(userId);
    }
    return next.handle();
  }
}
