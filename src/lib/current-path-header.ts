// Set by proxy.ts on every request so server code can recover which page a
// visitor was on without threading it through every call site. Kept in its
// own module with no other imports: proxy.ts runs in the Next "proxy" (nodejs,
// non-Pages/App-Router) runtime and cannot import next/headers.
export const CURRENT_PATH_HEADER = "x-pathname";
