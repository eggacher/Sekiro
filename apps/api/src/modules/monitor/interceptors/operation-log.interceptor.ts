import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { LogService } from "../services/log.service";

export const AUDIT_LOG_KEY = "audit_log_metadata";
export interface AuditLogOptions {
  module: string;
  description: string;
  type: "create" | "update" | "delete" | "export" | "other";
}

export const AuditLog = (options: AuditLogOptions) => SetMetadata(AUDIT_LOG_KEY, options);

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly logService: LogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (method === "GET") {
      return next.handle();
    }

    const startTime = Date.now();
    const auditMeta = this.reflector.get<AuditLogOptions>(AUDIT_LOG_KEY, context.getHandler());

    let moduleName = auditMeta?.module || "未知模块";
    let type = auditMeta?.type || "other";
    let description = auditMeta?.description || "";

    if (!auditMeta) {
      const url = request.url;
      if (url.includes("/system/user")) {
        moduleName = "用户管理";
        type = method === "POST" ? "create" : method === "PUT" ? "update" : "delete";
        description = `${method === "POST" ? "新增" : method === "PUT" ? "修改" : "删除"}用户`;
      } else if (url.includes("/system/role")) {
        moduleName = "角色管理";
        type = method === "POST" ? "create" : method === "PUT" ? "update" : "delete";
        description = `${method === "POST" ? "新增" : method === "PUT" ? "修改" : "删除"}角色`;
      } else if (url.includes("/system/menu")) {
        moduleName = "菜单管理";
        type = method === "POST" ? "create" : method === "PUT" ? "update" : "delete";
        description = `${method === "POST" ? "新增" : method === "PUT" ? "修改" : "删除"}菜单`;
      } else if (url.includes("/system/dept")) {
        moduleName = "部门管理";
        type = method === "POST" ? "create" : method === "PUT" ? "update" : "delete";
        description = `${method === "POST" ? "新增" : method === "PUT" ? "修改" : "删除"}部门`;
      } else if (url.includes("/system/dict")) {
        moduleName = "字典管理";
        type = method === "POST" ? "create" : method === "PUT" ? "update" : "delete";
        description = `${method === "POST" ? "新增" : method === "PUT" ? "修改" : "删除"}字典`;
      } else {
        moduleName = "系统管理";
        type = "other";
        description = `${method} ${url}`;
      }
    }

    const operator = request.user?.username || "anonymous";
    const ip = request.ip || "127.0.0.1";
    const url = request.url;

    return next.handle().pipe(
      tap(() => {
        const cost = Date.now() - startTime;
        this.logService.createOpLog({
          operator,
          module: moduleName,
          type,
          description,
          method,
          url,
          ip,
          cost,
          status: "success",
        }).catch(() => {});
      }),
      catchError((err) => {
        const cost = Date.now() - startTime;
        this.logService.createOpLog({
          operator,
          module: moduleName,
          type,
          description,
          method,
          url,
          ip,
          cost,
          status: "fail",
        }).catch(() => {});
        throw err;
      }),
    );
  }
}
