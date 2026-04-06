/**
 * Loads env for Node scripts (worker, smoke tests). Next.js loads .env* automatically.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

export function loadEnv(): void {
  config({ path: resolve(process.cwd(), ".env.local") });
  config({ path: resolve(process.cwd(), ".env") });
}
