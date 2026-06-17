// @prisma/client is generated as a CommonJS module, so under Node's ESM loader
// the named `import { PrismaClient }` fails. Import the default export and
// destructure instead.
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

export const prisma = new PrismaClient();
