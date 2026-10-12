import { execSync } from 'node:child_process';
import { applyTestEnv } from './test-env.js';

// Brings the test database up to date before any integration test runs.
export default function setup(): void {
  applyTestEnv();
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
