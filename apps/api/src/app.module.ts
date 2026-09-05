import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Injectable,
  Module,
  type OnApplicationShutdown,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import {
  createDatabaseConnection,
  type DatabaseConnection,
  readDatabaseConfig,
} from './database/client.js';
import { verifyDatabaseReadiness } from './database/migrate.js';

type HealthResponse = Readonly<{
  status: 'ok' | 'unavailable';
}>;

@Injectable()
class DatabaseReadinessService implements OnApplicationShutdown {
  private readonly connection: DatabaseConnection | undefined;

  constructor() {
    try {
      this.connection = createDatabaseConnection(readDatabaseConfig());
    } catch {
      this.connection = undefined;
    }
  }

  async isReady(): Promise<boolean> {
    if (this.connection === undefined) {
      return false;
    }

    return verifyDatabaseReadiness(this.connection.pool);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connection?.pool.end();
  }
}

@Controller('health')
class HealthController {
  constructor(private readonly databaseReadiness: DatabaseReadinessService) {}

  @Get('live')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.OK)
  live(): HealthResponse {
    return { status: 'ok' };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready(@Res({ passthrough: true }) response: FastifyReply): Promise<HealthResponse> {
    const ready = await this.databaseReadiness.isReady();

    response.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return { status: ready ? 'ok' : 'unavailable' };
  }
}

@Module({
  controllers: [HealthController],
  providers: [DatabaseReadinessService],
})
// Nest modules are intentionally metadata-only classes.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
