/**
 * Day 10 automated gate: unit tests + lint; optional build; optional live health check.
 *
 *   npm run e2e:mvp
 *   E2E_WITH_BUILD=1 npm run e2e:mvp
 *   E2E_BASE_URL=http://127.0.0.1:3000 npm run e2e:mvp   # requires `npm run dev`
 */
import { execSync } from "node:child_process";
import { loadEnv } from "../src/lib/load-env";

loadEnv();

const cwd = process.cwd();

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", cwd, env: process.env });
}

async function main() {
  console.log("[e2e-mvp] npm run test");
  run("npm run test");
  console.log("[e2e-mvp] npm run lint");
  run("npm run lint");

  if (process.env.E2E_WITH_BUILD === "1") {
    console.log("[e2e-mvp] npm run build (E2E_WITH_BUILD=1)");
    run("npm run build");
  }

  const base = process.env.E2E_BASE_URL?.replace(/\/$/, "");
  if (base) {
    const url = `${base}/api/health`;
    console.log("[e2e-mvp] GET", url);
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Health check failed: ${res.status} ${text}`);
    }
    console.log("[e2e-mvp] health:", text);
  } else {
    console.log(
      "[e2e-mvp] skip live health (set E2E_BASE_URL=http://127.0.0.1:3000 with dev server running)"
    );
  }

  console.log("[e2e-mvp] done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
