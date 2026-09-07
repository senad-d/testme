import { randomUUID } from 'node:crypto';

import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

// Contract declarations only: domain transitions, lockout policy (OQ-04), and
// the balance ceiling (OQ-11) remain owned by their gated implementation tasks.
export const PROBLEMS = {
  VALIDATION_FAILED: [400, 'Request validation failed', 'Check the request fields.'],
  AUTHENTICATION_REQUIRED: [401, 'Authentication required', 'Sign in to continue.'],
  FORBIDDEN: [403, 'Access denied', 'This action is not permitted.'],
  REGISTRATION_NOT_AVAILABLE: [403, 'Registration unavailable', 'Registration is not available.'],
  NOT_FOUND: [404, 'Not found', 'The requested resource was not found.'],
  STATE_CONFLICT: [409, 'State conflict', 'Refresh before trying again.'],
  CHILD_SESSION_ALREADY_ACTIVE: [409, 'Child Session already active', 'Refresh the session state.'],
  DAILY_SESSION_LIMIT_REACHED: [
    409,
    'Daily session limit reached',
    'No daily session slot is available.',
  ],
  IDEMPOTENCY_KEY_REUSED: [409, 'Idempotency key reused', 'Use a new key for a different request.'],
  REQUEST_ALREADY_RESOLVED: [
    409,
    'The request was already resolved',
    'Refresh to see the current request state.',
  ],
  INSUFFICIENT_AVAILABLE_BALANCE: [
    409,
    'Insufficient available balance',
    'The available balance is insufficient.',
  ],
  BALANCE_LIMIT_EXCEEDED: [
    409,
    'Balance limit exceeded',
    'The amount exceeds the supported technical range.',
  ],
  PAYLOAD_TOO_LARGE: [413, 'Request too large', 'Reduce the request size.'],
  UNSUPPORTED_MEDIA_TYPE: [415, 'Unsupported media type', 'Use a supported request media type.'],
  RATE_LIMITED: [429, 'Too many requests', 'Try again later.'],
  AUTH_TEMPORARILY_LOCKED: [429, 'Authentication temporarily locked', 'Try again later.'],
  INTERNAL_ERROR: [500, 'Internal server error', 'The request could not be completed.'],
  SERVICE_UNAVAILABLE: [503, 'Service unavailable', 'Try again later.'],
} as const;

export type ProblemCode = keyof typeof PROBLEMS;

export const REQUEST_ID_PATTERN =
  '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

const requestIdPattern = new RegExp(REQUEST_ID_PATTERN);

export function createRequestId(supplied: unknown): string {
  return typeof supplied === 'string' && requestIdPattern.test(supplied) ? supplied : randomUUID();
}

export function problemType(code: ProblemCode): string {
  return `urn:mobey:problem:${code.toLowerCase().replaceAll('_', '-')}`;
}

export class ProblemDetailsException extends HttpException {
  constructor(
    readonly code: ProblemCode,
    readonly retryAfterSeconds?: number,
  ) {
    super(PROBLEMS[code][2], PROBLEMS[code][0]);

    // Callers must supply an approved duration; there is deliberately no default.
    if (
      retryAfterSeconds !== undefined &&
      ((code !== 'RATE_LIMITED' && code !== 'AUTH_TEMPORARILY_LOCKED') ||
        !Number.isSafeInteger(retryAfterSeconds) ||
        retryAfterSeconds < 1)
    ) {
      throw new Error('Invalid retry interval.');
    }
  }
}

function problemCode(exception: unknown): ProblemCode {
  if (exception instanceof ProblemDetailsException) {
    return exception.code;
  }

  if (exception instanceof HttpException) {
    switch (exception.getStatus()) {
      case 400:
        return 'VALIDATION_FAILED';
      case 401:
        return 'AUTHENTICATION_REQUIRED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'STATE_CONFLICT';
      case 413:
        return 'PAYLOAD_TOO_LARGE';
      case 415:
        return 'UNSUPPORTED_MEDIA_TYPE';
      case 429:
        return 'RATE_LIMITED';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_ERROR';
    }
  }

  // Fastify router/parser errors happen before controller validation. Never serialize
  // their messages, bodies, URLs, or arbitrary statusCode properties.
  if (exception instanceof Error && 'code' in exception) {
    switch (exception.code) {
      case 'FST_ERR_CTP_BODY_TOO_LARGE':
        return 'PAYLOAD_TOO_LARGE';
      case 'FST_ERR_CTP_INVALID_MEDIA_TYPE':
        return 'UNSUPPORTED_MEDIA_TYPE';
      case 'FST_ERR_BAD_URL':
      case 'FST_ERR_MAX_PARAM_LENGTH':
      case 'FST_ERR_CTP_EMPTY_JSON_BODY':
      case 'FST_ERR_CTP_INVALID_JSON_BODY':
      case 'FST_ERR_CTP_INVALID_CONTENT_LENGTH':
        return 'VALIDATION_FAILED';
    }
  }

  return 'INTERNAL_ERROR';
}

export function sendProblemDetails(
  exception: unknown,
  request: FastifyRequest,
  response: FastifyReply,
): void {
  const code = problemCode(exception);
  const [status, title, detail] = PROBLEMS[code];

  if (exception instanceof ProblemDetailsException && exception.retryAfterSeconds !== undefined) {
    response.header('Retry-After', String(exception.retryAfterSeconds));
  }

  response
    .header('Cache-Control', 'no-store')
    .header('X-Request-Id', request.id)
    .type('application/problem+json')
    .status(status)
    .send({
      type: problemType(code),
      title,
      status,
      code,
      detail,
      // A correlation URI avoids reflecting private path/query identifiers.
      instance: `urn:mobey:request:${request.id}`,
      requestId: request.id,
    });
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    sendProblemDetails(
      exception,
      context.getRequest<FastifyRequest>(),
      context.getResponse<FastifyReply>(),
    );
  }
}
