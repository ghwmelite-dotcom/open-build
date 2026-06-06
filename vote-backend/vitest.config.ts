import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: { ADMIN_SECRET: "test-secret", ALLOWED_ORIGIN: "*" },
        },
      },
    },
  },
});
