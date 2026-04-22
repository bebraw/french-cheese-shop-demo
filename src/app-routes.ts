export const appRoutes = [
  { path: "/", purpose: "Interactive French cheese shop demo with baseline and challenge controls" },
  { path: "/api/search", purpose: "Realtime JSON cheese search for live demo scenarios" },
  { path: "/api/session", purpose: "Shared multiplayer room snapshot and command endpoint" },
  { path: "/api/session/live", purpose: "Realtime room sync transport for multiplayer demo sessions" },
  { path: "/api/health", purpose: "JSON health endpoint for tooling and smoke tests" },
] as const;
