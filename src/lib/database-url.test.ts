import { createServer, type Server, type Socket } from 'node:net';
import { PrismaPg } from '@prisma/adapter-pg';
import { pgAdapter, pgConfig, serverAcceptsTls } from './database-url';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({
    provider: 'postgres',
    adapterName: '@prisma/adapter-pg',
    connect: jest.fn().mockResolvedValue('connection'),
  })),
}));

describe('pgConfig', () => {
  it('asks the server about TLS when the URL has no sslmode, like Prisma 6', () => {
    const { pool, prefer } = pgConfig('postgresql://u:p@db.example.com:5433/pcn');
    expect(pool).toMatchObject({ connectionString: 'postgresql://u:p@db.example.com:5433/pcn' });
    expect(pool.ssl).toBe(false);
    expect(prefer).toEqual({ host: 'db.example.com', port: 5433 });
  });

  it('defaults to port 5432 and unwraps IPv6 hosts', () => {
    expect(pgConfig('postgresql://u:p@[::1]/pcn').prefer).toEqual({ host: '::1', port: 5432 });
  });

  it('honours sslmode and sslaccept', () => {
    const disabled = pgConfig('postgresql://u:p@db.example.com/x?sslmode=disable');
    expect(disabled.pool.ssl).toBe(false);
    expect(disabled).not.toHaveProperty('prefer');

    const required = pgConfig('postgresql://u:p@db.example.com/x?sslmode=require');
    expect(required.pool.ssl).toEqual({ rejectUnauthorized: false });
    expect(required).not.toHaveProperty('prefer');

    expect(
      pgConfig('postgresql://u:p@db.example.com/x?sslmode=require&sslaccept=strict').pool.ssl,
    ).toEqual({ rejectUnauthorized: true });

    expect(pgConfig('postgresql://u:p@db.example.com/x?sslmode=prefer').prefer).toBeDefined();
  });

  it("turns Prisma's pool parameters into pg's and drops them from the URL", () => {
    const { pool, schema } = pgConfig(
      'postgresql://u:p@db.example.com:6543/postgres?pgbouncer=true&connection_limit=3&pool_timeout=20&sslmode=require&schema=app&application_name=pcn',
    );
    expect(pool).toEqual({
      connectionString: 'postgresql://u:p@db.example.com:6543/postgres?application_name=pcn',
      ssl: { rejectUnauthorized: false },
      max: 3,
      connectionTimeoutMillis: 20_000,
    });
    expect(schema).toBe('app');
  });

  it('defaults to a 10 second pool timeout and no schema', () => {
    const config = pgConfig('postgresql://u:p@localhost/x');
    expect(config.pool.connectionTimeoutMillis).toBe(10_000);
    expect(config.pool.max).toBeGreaterThan(0);
    expect(config).not.toHaveProperty('schema');
  });

  it('leaves the pool without connection data when there is no URL (the Docker build)', () => {
    expect(pgConfig(undefined)).toEqual({ pool: {} });
  });
});

describe('serverAcceptsTls', () => {
  let server: Server | undefined;
  afterEach(() => server?.close());

  // A fake Postgres that answers the SSLRequest with `reply`.
  const listen = (reply: string) =>
    new Promise<number>((resolve) => {
      server = createServer((socket) =>
        socket.once('data', (data) => {
          expect(data.readInt32BE(0)).toBe(8);
          expect(data.readInt32BE(4)).toBe(80877103);
          socket.end(reply);
        }),
      ).listen(0, '127.0.0.1', () => {
        const address = server!.address();
        resolve(typeof address === 'object' && address ? address.port : 0);
      });
    });

  it('is true when the server answers S', async () => {
    const port = await listen('S');
    await expect(serverAcceptsTls('127.0.0.1', port, 1000)).resolves.toBe(true);
  });

  it('is false when the server answers N', async () => {
    const port = await listen('N');
    await expect(serverAcceptsTls('127.0.0.1', port, 1000)).resolves.toBe(false);
  });

  it('is false when nothing listens, so the real error shows up on connect', async () => {
    const port = await listen('N');
    await new Promise((resolve) => server!.close(resolve));
    server = undefined;
    await expect(serverAcceptsTls('127.0.0.1', port, 1000)).resolves.toBe(false);
  });
});

describe('serverAcceptsTls timeouts', () => {
  let server: Server | undefined;
  // The server never answers, so it still holds its end of the socket when the client gives up:
  // close() alone leaves that connection open and the Jest worker can't exit.
  const sockets: Socket[] = [];
  afterEach(async () => {
    sockets.splice(0).forEach((socket) => socket.destroy());
    await new Promise((resolve) => (server ? server.close(resolve) : resolve(undefined)));
  });

  it('is false when the server never answers', async () => {
    const port = await new Promise<number>((resolve) => {
      server = createServer((socket) => void sockets.push(socket)).listen(0, '127.0.0.1', () => {
        const address = server!.address();
        resolve(typeof address === 'object' && address ? address.port : 0);
      });
    });
    await expect(serverAcceptsTls('127.0.0.1', port, 50)).resolves.toBe(false);
  });
});

describe('pgAdapter', () => {
  let server: Server | undefined;
  afterEach(() => server?.close());

  const listen = (reply: string) =>
    new Promise<number>((resolve) => {
      server = createServer((socket) => socket.once('data', () => socket.end(reply))).listen(
        0,
        '127.0.0.1',
        () => {
          const address = server!.address();
          resolve(typeof address === 'object' && address ? address.port : 0);
        },
      );
    });

  it('returns the plain adapter when the URL fixes the TLS mode', () => {
    const adapter = pgAdapter('postgresql://u:p@db.example.com/x?sslmode=require&schema=app');

    expect(PrismaPg).toHaveBeenCalledWith(
      expect.objectContaining({ ssl: { rejectUnauthorized: false } }),
      { schema: 'app' },
    );
    expect(adapter).toBe(jest.mocked(PrismaPg).mock.results[0].value);
  });

  it('builds an adapter without connection data when there is no URL', () => {
    pgAdapter(undefined);

    expect(PrismaPg).toHaveBeenCalledWith({}, undefined);
  });

  it('uses TLS when the server accepts it (sslmode=prefer)', async () => {
    const port = await listen('S');
    const adapter = pgAdapter(`postgresql://u:p@127.0.0.1:${port}/x?sslaccept=strict`);

    expect(adapter.provider).toBe('postgres');
    expect(adapter.adapterName).toBe('@prisma/adapter-pg');
    await expect(adapter.connect()).resolves.toBe('connection');
    expect(jest.mocked(PrismaPg).mock.calls.at(-1)).toEqual([
      expect.objectContaining({ ssl: { rejectUnauthorized: true } }),
      undefined,
    ]);
  });

  it('connects without TLS when the server refuses it', async () => {
    const port = await listen('N');
    const adapter = pgAdapter(`postgresql://u:p@127.0.0.1:${port}/x?schema=app`);

    await adapter.connect();

    expect(jest.mocked(PrismaPg).mock.calls.at(-1)).toEqual([
      expect.objectContaining({ ssl: false }),
      { schema: 'app' },
    ]);
  });
});
