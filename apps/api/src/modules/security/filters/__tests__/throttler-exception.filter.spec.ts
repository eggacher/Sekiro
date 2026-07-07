import { describe, it, expect, vi } from "vitest";
import { ThrottlerException } from "@nestjs/throttler";
import { ThrottlerExceptionFilter } from "../throttler-exception.filter";

describe("ThrottlerExceptionFilter", () => {
  it("should return code 429 with HTTP 200", () => {
    const filter = new ThrottlerExceptionFilter();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as any;

    filter.catch(new ThrottlerException("Too many requests"), host);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      code: 429,
      message: "请求过于频繁，请稍后再试",
      data: null,
    });
  });
});
