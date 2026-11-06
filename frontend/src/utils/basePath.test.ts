import { describe, it, expect } from 'vitest';
import { resolveRouterBasename } from './basePath';

describe('resolveRouterBasename', () => {
  it('defaults to "/" when given empty or root strings', () => {
    expect(resolveRouterBasename('')).toBe('/');
    expect(resolveRouterBasename('   ')).toBe('/');
    expect(resolveRouterBasename('/')).toBe('/');
    expect(resolveRouterBasename('.')).toBe('/');
    expect(resolveRouterBasename('./')).toBe('/');
  });

  it('normalizes paths without leading slash', () => {
    expect(resolveRouterBasename('subrecon')).toBe('/subrecon');
    expect(resolveRouterBasename('subsrecon')).toBe('/subsrecon');
    expect(resolveRouterBasename('folder_name')).toBe('/folder_name');
  });

  it('strips trailing slashes from non-root paths', () => {
    expect(resolveRouterBasename('/subrecon/')).toBe('/subrecon');
    expect(resolveRouterBasename('/subsrecon/')).toBe('/subsrecon');
    expect(resolveRouterBasename('/nested/folder/')).toBe('/nested/folder');
  });

  it('preserves clean leading-slash non-trailing-slash paths', () => {
    expect(resolveRouterBasename('/subrecon')).toBe('/subrecon');
    expect(resolveRouterBasename('/folder_name')).toBe('/folder_name');
  });
});
