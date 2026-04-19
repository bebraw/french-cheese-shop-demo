export const appRoutes = [
  { path: "/", purpose: "Basic-auth protected supervisor search" },
  { path: "/api/search", purpose: "Realtime JSON search for supervisor matches" },
  { path: "/api/health", purpose: "JSON health endpoint for tooling and smoke tests" },
] as const;
