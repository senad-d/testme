import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  type OnApplicationShutdown,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import {
  getApplicationDescription,
  getApplicationName,
  getApplicationVersion,
} from '@mobey/shared';
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

type VersionResponse = Readonly<{
  version: string;
  name: string;
  description: string;
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
  constructor(
    @Inject(DatabaseReadinessService) private readonly databaseReadiness: DatabaseReadinessService,
  ) {}

  @ApiOkResponse({
    description: 'The API process is live.',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['status'],
      properties: { status: { type: 'string', enum: ['ok'] } },
    },
  })
  @Get('live')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.OK)
  live(): HealthResponse {
    return { status: 'ok' };
  }

  @ApiOkResponse({
    description: 'PostgreSQL is reachable and required migrations are applied.',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['status'],
      properties: { status: { type: 'string', enum: ['ok'] } },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Operational readiness report; not a controller exception.',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['status'],
      properties: { status: { type: 'string', enum: ['unavailable'] } },
    },
  })
  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready(@Res({ passthrough: true }) response: FastifyReply): Promise<HealthResponse> {
    const ready = await this.databaseReadiness.isReady();

    response.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return { status: ready ? 'ok' : 'unavailable' };
  }
}

@Controller('version')
class VersionController {
  @ApiOkResponse({
    description: 'The running application identity and version.',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['version', 'name', 'description'],
      properties: {
        version: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  @Get()
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.OK)
  version(): VersionResponse {
    return {
      version: getApplicationVersion(),
      name: getApplicationName(),
      description: getApplicationDescription(),
    };
  }
}

@Module({
  controllers: [HealthController, VersionController],
  providers: [DatabaseReadinessService],
})
// Nest modules are intentionally metadata-only classes.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
