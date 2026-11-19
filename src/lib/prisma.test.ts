import { checkCachedRead, expireModels } from '@/lib/cache';
import { pgAdapter } from '@/lib/database-url';
import { PrismaClient } from '@/generated/prisma/client';

// jest.setup.ts replaces '@/lib/prisma' with a deep mock everywhere; this file loads the real
// module over a fake PrismaClient to check how it builds the client and its cache extension.
jest.mock('@/generated/prisma/client', () => ({ PrismaClient: jest.fn() }));
jest.mock('@/lib/database-url', () => ({ pgAdapter: jest.fn(() => 'adapter') }));
jest.mock('@/lib/cache', () => ({ checkCachedRead: jest.fn(), expireModels: jest.fn() }));

type Operation = (_params: {
  model: string;
  operation: string;
  args: unknown;
  query: (_args: unknown) => Promise<unknown>;
}) => Promise<unknown>;

const globals = globalThis as { prismaGlobal?: unknown };
const env = process.env as Record<string, string | undefined>;
const ORIGINAL_NODE_ENV = env.NODE_ENV;

let extension: { name: string; query: { $allModels: { $allOperations: Operation } } };
const extended = { extended: true };
let displayNames: typeof extension;

beforeEach(() => {
  delete globals.prismaGlobal;
  jest.mocked(PrismaClient).mockImplementation(
    () =>
      ({
        $extends(ext: typeof extension) {
          if (ext.name !== 'data-cache') {
            if (ext.name === 'display-name') displayNames = ext;
            return this;
          }
          extension = ext;
          return extended;
        },
      }) as never,
  );
});

afterEach(() => {
  env.NODE_ENV = ORIGINAL_NODE_ENV;
  delete globals.prismaGlobal;
});

const load = () => {
  let prisma: unknown;
  jest.isolateModules(() => {
    prisma = jest.requireActual('./prisma').default;
  });
  return prisma;
};

const run = (operation: string, model = 'Event', args: unknown = { where: { id: '1' } }) => {
  const query = jest.fn().mockResolvedValue('result');
  return {
    query,
    result: extension.query.$allModels.$allOperations({ model, operation, args, query }),
  };
};

describe('prisma client', () => {
  it('connects through the pg adapter and never returns sensitive fields by default', () => {
    env.DATABASE_URL = 'postgresql://u:p@localhost/pcn';

    expect(load()).toBe(extended);
    expect(pgAdapter).toHaveBeenCalledWith('postgresql://u:p@localhost/pcn');
    expect(PrismaClient).toHaveBeenCalledWith({
      adapter: 'adapter',
      omit: {
        user: { password: true, twoFactorSecret: true, twoFactorRecoveryCodes: true },
        talkSpeaker: { speakerPhone: true },
        talkProposalSpeaker: { speakerPhone: true },
        event: { discountCode: true },
      },
    });
    expect(extension.name).toBe('data-cache');
  });

  it('shows the name of every user it returns, nested ones too, with long words capitalized', async () => {
    load();
    const rows = [
      {
        name: 'juan de la fuente',
        advice: [{ content: 'hola mundo', author: { name: 'ana maría' } }],
        _count: { name: 'sin tocar' },
      },
    ];

    const result = await displayNames.query.$allModels.$allOperations({
      model: 'User',
      operation: 'findMany',
      args: {},
      query: async () => rows,
    });

    expect(result).toEqual([
      {
        name: 'Juan de la Fuente',
        advice: [{ content: 'hola mundo', author: { name: 'ana María' } }],
        _count: { name: 'sin tocar' },
      },
    ]);
  });

  it('leaves the names of other models as they are', async () => {
    load();
    const result = await displayNames.query.$allModels.$allOperations({
      model: 'Badge',
      operation: 'findFirst',
      args: {},
      query: async () => ({ name: 'primer evento' }),
    });

    expect(result).toEqual({ name: 'primer evento' });
  });

  it('reuses the client kept on globalThis outside production (hot reload)', () => {
    const first = load();
    expect(globals.prismaGlobal).toBe(first);

    const kept = { kept: true };
    globals.prismaGlobal = kept;
    expect(load()).toBe(kept);
    expect(PrismaClient).toHaveBeenCalledTimes(1);
  });

  it("doesn't keep the client on globalThis in production", () => {
    env.NODE_ENV = 'production';

    load();

    expect(globals.prismaGlobal).toBeUndefined();
  });
});

describe('data-cache extension', () => {
  beforeEach(() => {
    load();
  });

  it('checks the tables a read uses against the cached read running it', async () => {
    const { query, result } = run('findMany', 'Event', { include: { talks: true } });

    await expect(result).resolves.toBe('result');
    expect(query).toHaveBeenCalledWith({ include: { talks: true } });
    expect(checkCachedRead).toHaveBeenCalledWith(expect.any(Set));
    expect([...jest.mocked(checkCachedRead).mock.calls[0][0]]).toEqual(
      expect.arrayContaining(['Event', 'Talk']),
    );
    expect(expireModels).not.toHaveBeenCalled();
  });

  it("doesn't check reads in production", async () => {
    env.NODE_ENV = 'production';

    await run('findUnique').result;

    expect(checkCachedRead).not.toHaveBeenCalled();
  });

  it.each(['create', 'update', 'upsert', 'deleteMany', 'createManyAndReturn'])(
    'expires the cached reads of the tables a %s writes, after it succeeds',
    async (operation) => {
      const { result } = run(operation);

      await expect(result).resolves.toBe('result');
      expect(expireModels).toHaveBeenCalledTimes(1);
      expect([...jest.mocked(expireModels).mock.calls[0][0]]).toContain('Event');
      expect(checkCachedRead).not.toHaveBeenCalled();
    },
  );

  it('expires the tables a delete cascades to', async () => {
    await run('delete', 'User').result;

    const expired = [...jest.mocked(expireModels).mock.calls[0][0]];
    expect(expired).toEqual(expect.arrayContaining(['User', 'Session']));
  });

  it("doesn't expire anything when the write fails", async () => {
    const query = jest.fn().mockRejectedValue(new Error('unique constraint'));

    await expect(
      extension.query.$allModels.$allOperations({
        model: 'Event',
        operation: 'create',
        args: {},
        query,
      }),
    ).rejects.toThrow('unique constraint');
    expect(expireModels).not.toHaveBeenCalled();
  });
});
