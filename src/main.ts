import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './configs/redis-adapter.config';
import { configSwagger } from './configs/swagger.config';
import { CacheDomain } from './services/cache.service';
import AppLoggerService from './services/app-logger.service';

async function bootstrap() {
  process.env.TZ = 'Asia/Ho_Chi_Minh';

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  app.use(helmet());

  app.use(cookieParser());

  app.useLogger(app.get(AppLoggerService));

  app.setGlobalPrefix(configService.get<string>('prefix'));

  configSwagger(app);

  const redisIoAdapter = new RedisIoAdapter(app, app.get(CacheDomain));
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.get<string>('version'),
  });

  const port = configService.get<number>('port');

  await app.listen(port, () => {
    const logger: Logger = new Logger('Server connection');
    logger.log(`⛩️ has started successfully running on port ${port}`);
  });
}

bootstrap();
