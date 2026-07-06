import "dotenv/config";
import * as path from "path";
import * as dotenv from "dotenv";
import { encryptConfig } from "../utils/crypto.util";

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../../../.env") });

const plaintext = process.argv[2];
const key = process.env.CONFIG_ENCRYPTION_KEY;

if (!plaintext) {
  console.error("Usage: pnpm encrypt:config <plaintext>");
  process.exit(1);
}

if (!key) {
  console.error("CONFIG_ENCRYPTION_KEY is required");
  process.exit(1);
}

console.log(encryptConfig(plaintext, key));
