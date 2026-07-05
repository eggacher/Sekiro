import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserDataScope } from "../types";

export const UserScope = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserDataScope => {
    const request = ctx.switchToHttp().getRequest();
    return request.dataScope || { userId: 0, isAll: false, isSelf: true, deptIds: [] };
  },
);
