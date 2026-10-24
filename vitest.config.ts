import path from "node:path";
import { defineConfig } from "vitest/config";

// Único banco permitido nos testes: o container local de scripts/test-db.mjs.
const TEST_DATABASE_URL = "postgresql://postgres:test@localhost:54329/app_beto_test";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    env: { DATABASE_URL: TEST_DATABASE_URL },
    globalSetup: ["src/test/global-setup.ts"],
    setupFiles: ["src/test/setup.ts"],
    // Os testes compartilham um único banco e o resetDb() entre eles.
    fileParallelism: false,
    include: ["src/**/*.test.ts"],
  },
});
