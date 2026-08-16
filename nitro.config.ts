export default defineNitroConfig({
  preset: "vercel",
  inlineDynamicImports: true,
  publicAssets: [
    {
      baseURL: "/",
      dir: "./dist/client",
    },
  ],
  handlers: [
    {
      route: "/**",
      handler: "./dist/server/server.js",
    },
  ],
});
