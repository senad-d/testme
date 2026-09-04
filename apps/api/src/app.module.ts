import { Controller, Get, Header, HttpCode, HttpStatus, Module } from '@nestjs/common';

type HealthResponse = Readonly<{
  status: 'ok' | 'unavailable';
}>;

@Controller('health')
class HealthController {
  @Get('live')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.OK)
  live(): HealthResponse {
    return { status: 'ok' };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.SERVICE_UNAVAILABLE)
  ready(): HealthResponse {
    return { status: 'unavailable' };
  }
}

@Module({
  controllers: [HealthController],
})
// Nest modules are intentionally metadata-only classes.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
