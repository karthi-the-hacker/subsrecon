/**
 * Resolves the router basename for React Router.
 * Reads from VITE_ROUTER_BASE, VITE_BASE_PATH, or Vite's import.meta.env.BASE_URL.
 *
 * Ensures React Router basename:
 * - Always starts with '/'
 * - Never ends with a trailing '/' (unless the path is exactly '/')
 *
 * Examples:
 * - "/subrecon/"  -> "/subrecon"
 * - "/subrecon"   -> "/subrecon"
 * - "subrecon"    -> "/subrecon"
 * - "/subsrecon/" -> "/subsrecon"
 * - "/"           -> "/"
 * - ""            -> "/"
 */
export function resolveRouterBasename(base?: string): string {
  const raw =
    base !== undefined
      ? base
      : (import.meta.env.VITE_ROUTER_BASE ||
         import.meta.env.VITE_BASE_PATH ||
         import.meta.env.BASE_URL ||
         '/');

  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === '/' || trimmed === '.' || trimmed === './') {
    return '/';
  }

  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const strippedTrailing = withLeading.replace(/\/+$/, '');
  return strippedTrailing || '/';
}

export const ROUTER_BASENAME = resolveRouterBasename();
