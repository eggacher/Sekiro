import { Injectable, Inject } from "@nestjs/common";
import { RedisSessionProvider } from "../../auth/providers/redis-session.provider";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class OnlineService {
  constructor(
    @Inject(RedisSessionProvider) private readonly redisSession: RedisSessionProvider,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async getOnlineUsers(query: { username?: string; ip?: string }) {
    const keys = await this.redisSession.getSessionKeys();
    const rawSessions: any[] = [];

    for (const key of keys) {
      const sessionId = key.replace("sekiro:session:", "");
      const session = await this.redisSession.getSession(sessionId);
      if (session) {
        if (query.username && !session.username.includes(query.username)) continue;
        if (query.ip && !session.ip.includes(query.ip)) continue;
        rawSessions.push({ sessionId, session });
      }
    }

    if (rawSessions.length === 0) return [];

    const userIds = Array.from(new Set(rawSessions.map((x) => x.session.userId)));
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.nickname]));

    return rawSessions.map((item) => {
      const ua = item.session.userAgent || "";
      let browser = "Unknown";
      let os = "Unknown";

      if (ua.includes("Chrome")) browser = "Chrome";
      else if (ua.includes("Safari")) browser = "Safari";
      else if (ua.includes("Firefox")) browser = "Firefox";

      if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
      else if (ua.includes("Windows")) os = "Windows";
      else if (ua.includes("Linux")) os = "Linux";

      const location = item.session.ip === "127.0.0.1" || item.session.ip === "::1" ? "内网" : "未知";

      return {
        id: item.sessionId,
        username: item.session.username,
        nickname: userMap.get(item.session.userId) || item.session.username,
        ip: item.session.ip,
        location,
        browser,
        os,
        loginTime: item.session.createdAt,
        lastActive: "刚刚",
      };
    });
  }

  async forceLogout(sessionId: string) {
    await this.redisSession.deleteSession(sessionId);
  }
}
