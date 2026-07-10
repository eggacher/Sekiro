import { Injectable } from "@nestjs/common";
import * as speakeasy from "speakeasy";

@Injectable()
export class MfaProvider {
  generateSecret(): string {
    return speakeasy.generateSecret({ length: 32 }).base32;
  }

  getOtpauthUrl(
    secret: string,
    username: string,
    issuer: string = "Sekiro",
  ): string {
    return speakeasy.otpauthURL({
      secret,
      label: `${issuer}:${username}`,
      issuer,
      encoding: "base32",
    });
  }

  verify(secret: string, code: string, window: number = 1): boolean {
    return !!speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: code,
      window,
    });
  }
}
