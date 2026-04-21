import { createHealthResponse } from "./api/health";
import { createSearchResponse } from "./api/search";
import { appRoutes } from "./app-routes";
import { renderHomePage } from "./views/home";
import { renderHomeScript } from "./views/home-script";
import { renderNotFoundPage } from "./views/not-found";
import { cssResponse, htmlResponse, javascriptResponse } from "./views/shared";

export default {
  async fetch(request: Request): Promise<Response> {
    return await handleRequest(request);
  },
};

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/styles.css") {
    return cssResponse(await loadStylesheet());
  }

  if (url.pathname === "/app.js") {
    return javascriptResponse(renderHomeScript());
  }

  if (url.pathname === "/api/health") {
    return createHealthResponse(appRoutes.map((route) => route.path));
  }

  if (url.pathname === "/") {
    return htmlResponse(renderHomePage());
  }

  if (url.pathname === "/api/search") {
    return await createSearchResponse(request);
  }

  return htmlResponse(renderNotFoundPage(url.pathname), 404);
}

async function loadStylesheet(): Promise<string> {
  if (typeof process !== "undefined" && process.release?.name === "node") {
    const { readFile } = await import("node:fs/promises");
    return await readFile(new URL("../.generated/styles.css", import.meta.url), "utf8");
  }

  const styles = await import("../.generated/styles.css");
  return styles.default;
}
