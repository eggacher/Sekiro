import { UploadedFile } from "@nestjs/common";
import {
  FileValidationPipe,
  FileValidationOptions,
} from "../pipes/file-validation.pipe";

export const ValidatedFile = (options?: FileValidationOptions) =>
  UploadedFile(new FileValidationPipe(options));
