// Loads environment variables from a local .env file (development) before any
// other module captures them. In production (e.g. Render) the variables are set
// in the platform environment and no .env file exists, which is fine.
//
// This module MUST be imported first in server.js so the values are populated
// before modules that read process.env at import time (auth secrets, etc.).
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(); // loads ./.env relative to cwd
  } catch {
    // No .env file present — rely on real environment variables.
  }
}

// Fail fast on missing critical secrets rather than producing confusing
// runtime auth errors later.
if (!process.env.JWT_SECRET) {
  console.error(
    "FATAL: JWT_SECRET is not set. Refusing to start. " +
      "Set it in the environment (or .env for local development)."
  );
  process.exit(1);
}
