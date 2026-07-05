import { Injectable, Inject } from "@nestjs/common";
import { RedisClientType } from "redis";
import { Session } from "../types";
import { REDIS_CLIENT } from "../../../redis.module";

@Injectable()
export class RedisSessionProvider {
  constructor(@Inject(REDIS_CLIENT) private redisClient: RedisClientType) {}

  async createSession(
    sessionId: string,
    session: Session,
    ttl: number = 2592000, // 30 days
  ): Promise<void> {
    const key = `sekiro:session:${sessionId}`;
    const value = JSON.stringify(session);
    await this.redisClient.setEx(key, ttl, value);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const key = `sekiro:session:${sessionId}`;
    const value = await this.redisClient.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as Session;
  }

  async updateSessionToken(sessionId: string, newToken: string): Promise<void> {
    const key = `sekiro:session:${sessionId}`;
    const session = await this.getSession(sessionId);
    if (!session) {
      return;
    }
    session.token = newToken;
    session.lastActiveAt = new Date().toISOString();
    const ttl = await this.redisClient.ttl(key);
    if (ttl > 0) {
      await this.redisClient.setEx(key, ttl, JSON.stringify(session));
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `sekiro:session:${sessionId}`;
    await this.redisClient.del(key);
  }

  async getSessionKeys(): Promise<string[]> {
    return this.redisClient.keys("sekiro:session:*");
  }
}
