import { describe, it, expect } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { FileValidationPipe } from "../file-validation.pipe";

function createFile(
  originalname: string,
  buffer: Buffer,
  size?: number,
): Express.Multer.File {
  return {
    fieldname: "file",
    originalname,
    encoding: "7bit",
    mimetype: "application/octet-stream",
    size: size ?? buffer.length,
    buffer,
    destination: "",
    filename: originalname,
    path: "",
    stream: null as any,
  };
}

describe("FileValidationPipe", () => {
  const options = {
    maxSize: 1024,
    allowedExtensions: [".png"],
    allowedTypes: ["image/png"],
  };

  it("should accept a valid PNG", async () => {
    const buffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    const file = createFile("valid.png", buffer);
    const pipe = new FileValidationPipe(options);
    const result = await pipe.transform(file);
    expect(result.originalname).toBe("valid.png");
  });

  it("should reject wrong extension", async () => {
    const file = createFile("valid.exe", Buffer.from("MZ"));
    const pipe = new FileValidationPipe(options);
    await expect(pipe.transform(file)).rejects.toThrow(BadRequestException);
  });

  it("should reject executable magic", async () => {
    const file = createFile("valid.png", Buffer.from("MZ executable content"));
    const pipe = new FileValidationPipe(options);
    await expect(pipe.transform(file)).rejects.toThrow(BadRequestException);
  });

  it("should reject oversized file", async () => {
    const buffer = Buffer.alloc(2048, 0);
    buffer[0] = 0x89;
    buffer[1] = 0x50;
    buffer[2] = 0x4e;
    buffer[3] = 0x47;
    const file = createFile("big.png", buffer, 2048);
    const pipe = new FileValidationPipe(options);
    await expect(pipe.transform(file)).rejects.toThrow(BadRequestException);
  });
});
