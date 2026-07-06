import { describe, it, expect } from "vitest";
import { ExecutionContext } from "@nestjs/common";
import { FileValidationExceptionFilter } from "../file-validation-exception.filter";
import { FileValidationException } from "../../exceptions/file-validation.exception";

function createMockContext() {
  let statusCode = 0;
  let body: unknown;

  const response = {
    status: (code: number) => {
      statusCode = code;
      return response;
    },
    json: (data: unknown) => {
      body = data;
    },
  };

  const ctx = {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;

  return { ctx, getStatusCode: () => statusCode, getBody: () => body };
}

describe("FileValidationExceptionFilter", () => {
  it("should map FileValidationException to HTTP 200 with code 422", () => {
    const filter = new FileValidationExceptionFilter();
    const { ctx, getStatusCode, getBody } = createMockContext();

    filter.catch(new FileValidationException("file too large"), ctx);

    expect(getStatusCode()).toBe(200);
    expect(getBody()).toEqual({
      code: 422,
      message: "file too large",
      data: null,
    });
  });
});
