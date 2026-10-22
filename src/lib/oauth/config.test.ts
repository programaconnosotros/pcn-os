import { isMcpEnabled, mcpResourceUrl, publicOrigin } from './config';

const headersOf = (values: Record<string, string>) => new Headers(values);
const env = process.env as Record<string, string | undefined>;

describe('publicOrigin', () => {
  const original = { ...process.env };
  afterEach(() => {
    // Assigning undefined to process.env stores the string "undefined": delete instead.
    for (const key of ['NODE_ENV', 'MCP_PUBLIC_ORIGIN', 'NEXT_PUBLIC_SITE_URL']) {
      if (original[key] === undefined) delete env[key];
      else env[key] = original[key];
    }
  });

  it('ignores forged hosts in production', () => {
    env.NODE_ENV = 'production';
    delete env.MCP_PUBLIC_ORIGIN;
    delete env.NEXT_PUBLIC_SITE_URL;
    expect(publicOrigin(headersOf({ host: 'evil.com', 'x-forwarded-host': 'evil.com' }))).toBe(
      'https://programaconnosotros.com',
    );
    env.MCP_PUBLIC_ORIGIN = 'https://staging.example.com/whatever';
    expect(publicOrigin(headersOf({ host: 'evil.com' }))).toBe('https://staging.example.com');
  });

  it('follows local hosts in development', () => {
    env.NODE_ENV = 'development';
    delete env.MCP_PUBLIC_ORIGIN;
    expect(publicOrigin(headersOf({ host: 'pcn-website.localhost' }))).toBe(
      'https://pcn-website.localhost',
    );
    expect(publicOrigin(headersOf({ host: 'feat-x.pcn-website.localhost:1355' }))).toBe(
      'https://feat-x.pcn-website.localhost:1355',
    );
    expect(publicOrigin(headersOf({ host: 'localhost:3000' }))).toBe('http://localhost:3000');
    expect(publicOrigin(headersOf({ host: 'localhost:3000', 'x-forwarded-proto': 'https' }))).toBe(
      'https://localhost:3000',
    );
  });

  it('never trusts a non-local host in development', () => {
    env.NODE_ENV = 'development';
    delete env.MCP_PUBLIC_ORIGIN;
    expect(publicOrigin(headersOf({ host: 'evil.com' }))).toBe('http://localhost:3000');
    expect(publicOrigin(headersOf({ host: 'localhost.evil.com' }))).toBe('http://localhost:3000');
  });
});

describe('MCP settings', () => {
  it('builds the resource URL', () => {
    expect(mcpResourceUrl('https://programaconnosotros.com')).toBe(
      'https://programaconnosotros.com/api/mcp',
    );
  });

  it('turns off only with MCP_ENABLED=false', () => {
    delete env.MCP_ENABLED;
    expect(isMcpEnabled()).toBe(true);
    env.MCP_ENABLED = 'false';
    expect(isMcpEnabled()).toBe(false);
    delete env.MCP_ENABLED;
  });
});
