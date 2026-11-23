import { execSync } from "node:child_process";

/**
 * Local stack only (docker compose in ../afterbox-backend):
 * - the API must be healthy. Backend issue #4 can leave it holding hung database connections from an earlier run;
 *   then it's restarted, as docs/LOCAL_STACK.md says.
 * - the per-IP sign-in code limit (20 an hour) is reset in the local Redis, so a run doesn't fail on the previous
 *   run's sign-ins. Nothing else is touched.
 */
async function healthy() {
  try {
    const response = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

export default async function globalSetup() {
  if (!(await healthy())) {
    execSync("docker compose restart api", { cwd: "../afterbox-backend", stdio: "ignore" });
    const deadline = Date.now() + 120_000;
    while (!(await healthy())) {
      if (Date.now() > deadline) throw new Error("The local API isn't healthy: docker compose up -d api worker redis (../afterbox-backend)");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  execSync(`docker exec afterbox-redis-1 sh -c 'redis-cli --scan --pattern "throttle:auth-start-ip*" | xargs -r redis-cli del'`, { stdio: "ignore" });
}
