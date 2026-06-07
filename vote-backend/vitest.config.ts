import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: {
        bindings: {
          ADMIN_SECRET: "test-secret",
          ALLOWED_ORIGIN: "https://open-build.pages.dev,https://open-build.ohwpstudios.org",
          TELEGRAM_BOT_TOKEN: "test-token",
          TELEGRAM_CHAT_ID: "-100test",
        },
      },
    }),
  ],
});
