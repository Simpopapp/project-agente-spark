import { createServerFn } from "@tanstack/react-start";

export const getStudioMeta = createServerFn({ method: "GET" }).handler(async () => {
  return {
    version: "1.0.0",
    now: new Date().toISOString(),
    modules: ["image", "video", "docs", "brand", "publish"],
  };
});
