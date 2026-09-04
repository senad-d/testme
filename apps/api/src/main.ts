import { pathToFileURL } from 'node:url';

import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyReply } from 'fastify';
import 'reflect-metadata';

import { AppModule } from './app.module.js';

const API_PREFIX = 'api/v1';
const API_PORT = 3000;
const MAX_REQUEST_BODY_BYTES = 1_048_576;

@Catch(NotFoundException)
class NotFoundExceptionFilter implements ExceptionFilter {
  catch(_exception: NotFoundException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();

    response
      .header('Cache-Control', 'no-store')
      .status(HttpStatus.NOT_FOUND)
      .send({ statusCode: HttpStatus.NOT_FOUND, message: 'Not Found' });
  }
}

export async function createApplication(): Promise<NestFastifyApplication> {
  const application = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: MAX_REQUEST_BODY_BYTES,
      logger: false,
    }),
    { logger: false },
  );

  application.setGlobalPrefix(API_PREFIX);
  application.useGlobalFilters(new NotFoundExceptionFilter());
  application.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      whitelist: true,
    }),
  );
  application.enableShutdownHooks();

  return application;
}

async function bootstrap(): Promise<void> {
  const application = await createApplication();
  await application.listen(API_PORT, '127.0.0.1');
}

const entrypoint = process.argv[1];

if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
  void bootstrap().catch(() => {
    process.stderr.write('API startup failed.\n');
    process.exitCode = 1;
  });
}
