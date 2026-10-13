import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { EnvironmentVariables } from '../config/env.validation.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { toPoolConfig } from './pool-config.js';

// The connection opens on the first query, so modules that never touch the
// database (such as health) do not need MySQL to be reachable.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(
    @Inject(ConfigService)
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    super({
      adapter: new PrismaMariaDb(
        toPoolConfig(config.get('DATABASE_URL', { infer: true })),
      ),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
