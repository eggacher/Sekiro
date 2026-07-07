import { BadRequestException } from "@nestjs/common";

/**
 * Thrown by FileValidationPipe when an uploaded file does not meet
 * size, extension, type, or executable-content constraints.
 *
 * Extends BadRequestException so existing consumers that catch the generic
 * NestJS exception still work, while a dedicated filter can map it to the
 * project-standard ApiResponse envelope with code 422.
 */
export class FileValidationException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
