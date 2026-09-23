import { PrismaClient } from "@/generated/prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// On Cloudflare Workers the D1 binding lives on the request-scoped env, so the
// Prisma client can't be built at module load. We resolve it lazily on first
// use and memoize it per isolate (the DB binding is stable within a worker
// instance). A Proxy keeps the existing `import { prisma }` call sites working
// unchanged across the app.
let client: PrismaClient | undefined;

function resolveClient(): PrismaClient {
  if (client) return client;
  const { env } = getCloudflareContext();
  const adapter = new PrismaD1(env.DB);
  client = new PrismaClient({ adapter });
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const c = resolveClient();
    const value = Reflect.get(c as object, prop, receiver);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
