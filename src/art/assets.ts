/**
 * Files under public/ (painted art, the hero's sheet). The single-file build (scripts/build-artifact.mjs) has no
 * public/ folder, so it inlines them as `window.__ASSETS__`: data URIs for pictures, parsed objects for JSON.
 */
const inlined = (globalThis as { __ASSETS__?: Record<string, unknown> }).__ASSETS__;

export const assetUrl = (path: string): string => (inlined?.[path] as string | undefined) ?? path;

/** A JSON file's contents when the build inlined it (otherwise load it from `path`). */
export const inlinedJson = <T>(path: string): T | undefined => inlined?.[path] as T | undefined;
