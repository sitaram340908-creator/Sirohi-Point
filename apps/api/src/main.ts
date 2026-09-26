import { Logger, VersioningType, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import express from 'express';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const clientAppUrl = (process.env.CLIENT_APP_URL ?? 'https://sirohi-point-iota.vercel.app').replace(/\/$/, '');
  const allowedOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:5084,http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!allowedOrigins.includes(clientAppUrl)) allowedOrigins.push(clientAppUrl);

  app.use(helmet());
  const uploadsDirectory = resolve(process.cwd(), 'uploads');
  mkdirSync(uploadsDirectory, { recursive: true });
  app.getHttpAdapter().getInstance().use('/uploads', express.static(uploadsDirectory, {
    setHeaders: (response) => {
      response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  }));
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.getHttpAdapter().getInstance().get('/business/cart', (_request: Request, response: Response) => response.redirect(302, `${clientAppUrl}/business/login`));
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sirohi Point API')
    .setDescription(
      'Marketplace, service, procurement, and role operations API',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
    { useGlobalPrefix: true },
  );

  await app.listen(process.env.PORT ?? 8075);

  const listeningUrl = new URL(await app.getUrl());
  const host = ['0.0.0.0', '[::]', '::'].includes(listeningUrl.hostname)
    ? 'localhost'
    : listeningUrl.hostname;
  const origin = `${listeningUrl.protocol}//${host}${listeningUrl.port ? `:${listeningUrl.port}` : ''}`;
  const apiUrl = `${origin}/api/v1`;
  const logger = new Logger('Bootstrap');
  logger.log(`API listening on port ${listeningUrl.port || '(default)'}`);
  logger.log(`API URL: ${apiUrl}`);
  logger.log(`Health check: ${apiUrl}/health`);
  logger.log(`Swagger docs: ${origin}/api/docs`);
}
void bootstrap();
