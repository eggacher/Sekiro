import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserDataScope } from "../types";

@Injectable()
export class DataScopeService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async calculateScope(userId: number): Promise<UserDataScope> {
    if (userId === 1) {
      return { userId, isAll: true, isSelf: false, deptIds: [] };
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { deptId: true },
    });
    const userDeptId = user?.deptId || null;

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            depts: true,
          },
        },
      },
    });

    if (userRoles.length === 0) {
      return { userId, isAll: false, isSelf: true, deptIds: [] };
    }

    const activeRoles = userRoles.filter((ur) => !ur.role.deletedAt && ur.role.status === "enabled");
    if (activeRoles.length === 0) {
      return { userId, isAll: false, isSelf: true, deptIds: [] };
    }

    const scopes = activeRoles.map((ur) => ur.role.dataScope);

    if (scopes.includes("all")) {
      return { userId, isAll: true, isSelf: false, deptIds: [] };
    }

    let isSelf = false;
    const allowedDeptIds = new Set<number>();

    for (const ur of activeRoles) {
      const role = ur.role;

      if (role.dataScope === "custom") {
        role.depts.forEach((d) => allowedDeptIds.add(d.deptId));
      } else if (role.dataScope === "dept") {
        if (userDeptId) allowedDeptIds.add(userDeptId);
      } else if (role.dataScope === "dept_and_below") {
        if (userDeptId) {
          allowedDeptIds.add(userDeptId);
          const children = await this.getChildDeptIds(userDeptId);
          children.forEach((id) => allowedDeptIds.add(id));
        }
      } else if (role.dataScope === "self") {
        isSelf = true;
      }
    }

    if (allowedDeptIds.size > 0) {
      return { userId, isAll: false, isSelf: false, deptIds: Array.from(allowedDeptIds) };
    }

    return { userId, isAll: false, isSelf, deptIds: [] };
  }

  private async getChildDeptIds(parentId: number): Promise<number[]> {
    const depts = await this.prisma.dept.findMany({
      where: { deletedAt: null },
      select: { id: true, parentId: true },
    });

    const parentToChildren = new Map<number, number[]>();
    for (const d of depts) {
      if (d.parentId) {
        if (!parentToChildren.has(d.parentId)) {
          parentToChildren.set(d.parentId, []);
        }
        parentToChildren.get(d.parentId)!.push(d.id);
      }
    }

    const result: number[] = [];
    const queue = [parentId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = parentToChildren.get(current);
      if (children) {
        for (const child of children) {
          result.push(child);
          queue.push(child);
        }
      }
    }
    return result;
  }
}
