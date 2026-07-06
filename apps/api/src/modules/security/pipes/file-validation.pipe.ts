import {
  Injectable,
  PipeTransform,
} from "@nestjs/common";
import * as path from "path";
import { FileValidationException } from "../exceptions/file-validation.exception";

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

const EXECUTABLE_EXTENSIONS = new Set([
  ".exe", ".dll", ".bat", ".cmd", ".sh", ".php",
  ".jsp", ".asp", ".aspx", ".jar", ".bin", ".com",
]);

const EXECUTABLE_MAGICS = [
  Buffer.from([0x4d, 0x5a]), // MZ
  Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF
  Buffer.from([0x23, 0x21]), // shebang
];

function matchMimePattern(actual: string, pattern: string): boolean {
  if (pattern === "*/*") return true;
  if (pattern.endsWith("/*")) {
    return actual.startsWith(pattern.slice(0, -1));
  }
  return actual === pattern;
}

function hasExecutableMagic(buffer: Buffer): boolean {
  return EXECUTABLE_MAGICS.some((magic) =>
    buffer.length >= magic.length && buffer.subarray(0, magic.length).equals(magic),
  );
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly options: FileValidationOptions = {}) {}

  async transform(file: Express.Multer.File): Promise<Express.Multer.File> {
    if (!file) {
      throw new FileValidationException("file is required");
    }

    const ext = path.extname(file.originalname).toLowerCase();

    if (EXECUTABLE_EXTENSIONS.has(ext)) {
      throw new FileValidationException(`file type ${ext} is not allowed`);
    }

    if (this.options.allowedExtensions?.length) {
      if (!this.options.allowedExtensions.includes(ext)) {
        throw new FileValidationException(`file extension ${ext} is not allowed`);
      }
    }

    const maxSize = this.options.maxSize ?? parseInt(process.env.UPLOAD_MAX_SIZE || "5242880", 10);
    if (file.size > maxSize) {
      throw new FileValidationException(
        `file size exceeds limit of ${maxSize} bytes`,
      );
    }

    if (hasExecutableMagic(file.buffer)) {
      throw new FileValidationException("executable file content is not allowed");
    }

    if (this.options.allowedTypes?.length) {
      const { fileTypeFromBuffer } = await import("file-type");
      const detected = await fileTypeFromBuffer(file.buffer);
      if (!detected) {
        throw new FileValidationException(
          "unable to determine file MIME type from content",
        );
      }
      const allowed = this.options.allowedTypes.some((pattern) =>
        matchMimePattern(detected.mime, pattern),
      );
      if (!allowed) {
        throw new FileValidationException(`file MIME type ${detected.mime} is not allowed`);
      }
    }

    return file;
  }
}
