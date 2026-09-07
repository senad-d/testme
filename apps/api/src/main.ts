import { pathToFileURL } from 'node:url';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import 'reflect-metadata';

import { AppModule } from './app.module.js';
import {
  createRequestId,
  ProblemDetailsException,
  ProblemDetailsFilter,
  sendProblemDetails,
} from './common/http/problem-details.filter.js';

const API_PREFIX = 'api/v1';
const API_PORT = 3000;
const MAX_REQUEST_BODY_BYTES = 1_048_576;

class StrictValidationPipe extends ValidationPipe {
  protected override stripProtoKeys(value: unknown): void {
    // Nest removes these keys before whitelist validation. Reject them instead
    // of silently accepting fields that the strict DTO schema forbids.
    if (
      value !== null &&
      typeof value === 'object' &&
      ['__proto__', 'prototype', 'constructor'].some((key) => Object.hasOwn(value, key))
    ) {
      throw new ProblemDetailsException('VALIDATION_FAILED');
    }
    super.stripProtoKeys(value);
  }
}

export function configureHttp(application: NestFastifyApplication): void {
  const fastify: FastifyInstance = application.getHttpAdapter().getInstance();

  fastify.addHook('onRequest', (request, reply, done) => {
    request.id = createRequestId(request.headers['x-request-id']);
    reply.header('X-Request-Id', request.id);
    done();
  });

  application.setGlobalPrefix(API_PREFIX);
  application.useGlobalFilters(new ProblemDetailsFilter());
  application.useGlobalPipes(
    new StrictValidationPipe({
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
      exceptionFactory: () => new ProblemDetailsException('VALIDATION_FAILED'),
    }),
  );
}

export async function createApplication(): Promise<NestFastifyApplication> {
  const application = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: MAX_REQUEST_BODY_BYTES,
      logger: false,
      frameworkErrors: (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
        // Router failures precede onRequest and Nest's exception filter.
        request.id = createRequestId(request.headers['x-request-id']);
        sendProblemDetails(error, request, reply);
      },
    }),
    { logger: false },
  );

  configureHttp(application);
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
