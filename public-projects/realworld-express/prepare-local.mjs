import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const database = new URL(process.env.DATABASE_URL);
if (!['postgresql:', 'postgres:'].includes(database.protocol) ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname)) {
  throw new Error('本地 RealWorld 迁移需要回环地址上的 PostgreSQL 测试库');
}

const require = createRequire(import.meta.url);
execFileSync(process.execPath, [require.resolve('prisma'), 'migrate', 'deploy'], { stdio: 'inherit' });
