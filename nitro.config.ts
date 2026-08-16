import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  preset: "vercel",
  inlineDynamicImports: true,
  handlers: [
    {
      route: "/**",
      handler: "./dist/server/server.js",
    },
  ],
});
