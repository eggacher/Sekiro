import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { OperationLogInterceptor, AUDIT_LOG_KEY } from "../interceptors/operation-log.interceptor";

describe("OperationLogInterceptor", () => {
  let interceptor: OperationLogInterceptor;
  let reflector: any;
  let logService: any;
  let mockRequest: any;
  let mockContext: any;
  let mockCallHandler: any;

  beforeEach(() => {
    reflector = {
      get: vi.fn(),
    };
    logService = {
      createOpLog: vi.fn().mockResolvedValue({ id: 1 }),
    };
    interceptor = new OperationLogInterceptor(reflector, logService);

    mockRequest = {
      method: "POST",
      url: "/system/user",
      ip: "127.0.0.1",
      user: { username: "admin" },
    };

    mockContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: () => mockRequest,
      }),
      getHandler: vi.fn().mockReturnValue("mockHandler"),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: vi.fn().mockReturnValue(of({ success: true })),
    } as unknown as CallHandler;
  });

  it("should bypass GET requests", async () => {
    mockRequest.method = "GET";

    const result$ = interceptor.intercept(mockContext, mockCallHandler);
    await new Promise((resolve) => result$.subscribe(resolve));

    expect(mockCallHandler.handle).toHaveBeenCalled();
    expect(reflector.get).not.toHaveBeenCalled();
    expect(logService.createOpLog).not.toHaveBeenCalled();
  });

  it("should log request using metadata if present", async () => {
    reflector.get.mockReturnValueOnce({
      module: "Custom Module",
      description: "Custom Description",
      type: "create",
    });

    const result$ = interceptor.intercept(mockContext, mockCallHandler);
    await new Promise((resolve) => result$.subscribe(resolve));

    expect(reflector.get).toHaveBeenCalledWith(AUDIT_LOG_KEY, "mockHandler");
    expect(logService.createOpLog).toHaveBeenCalledWith(
      expect.objectContaining({
        operator: "admin",
        module: "Custom Module",
        description: "Custom Description",
        type: "create",
        method: "POST",
        url: "/system/user",
        status: "success",
      })
    );
  });

  it("should fallback to URL-based log description when metadata is absent", async () => {
    reflector.get.mockReturnValueOnce(null);
    mockRequest.url = "/system/role";
    mockRequest.method = "PUT";

    const result$ = interceptor.intercept(mockContext, mockCallHandler);
    await new Promise((resolve) => result$.subscribe(resolve));

    expect(logService.createOpLog).toHaveBeenCalledWith(
      expect.objectContaining({
        operator: "admin",
        module: "角色管理",
        description: "修改角色",
        type: "update",
        method: "PUT",
        url: "/system/role",
        status: "success",
      })
    );
  });

  it("should log with status 'fail' and rethrow if execution fails", async () => {
    reflector.get.mockReturnValueOnce(null);
    const mockError = new Error("something went wrong");
    mockCallHandler.handle = vi.fn().mockReturnValue(throwError(() => mockError));

    const result$ = interceptor.intercept(mockContext, mockCallHandler);

    await new Promise<void>((resolve, reject) => {
      result$.subscribe({
        next: () => reject(new Error("should have failed")),
        error: (err) => {
          expect(err).toBe(mockError);
          resolve();
        },
      });
    });

    expect(logService.createOpLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "fail",
      })
    );
  });
});
