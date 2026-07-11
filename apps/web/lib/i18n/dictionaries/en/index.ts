import { common } from "./common";
import { login } from "./login";
import { dashboard } from "./dashboard";
import { profile } from "./profile";
import { system } from "./system";
import { monitor } from "./monitor";

export const en = {
  ...common,
  ...login,
  ...dashboard,
  ...profile,
  ...system,
  ...monitor,
} as const;
