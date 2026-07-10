import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'requiresPermissions';

export const RequiresPermissions = (code: string) =>
  SetMetadata(PERMISSIONS_KEY, code);
