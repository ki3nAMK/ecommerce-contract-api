import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import * as moment from 'moment';

const api_documentation_credentials = {
  name: process.env.API_DOCS_USERNAME,
  pass: process.env.API_DOCS_PASSWORD,
};

export function configSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Apollo Project')
    .setDescription(
      `## Apollo Chat API

Apollo is a real-time chat platform (similar to Discord) with **AI integration**,
allowing users to choose different AI personas and interact in conversations.

_Last build: ${moment().format('YYYY-MM-DD HH:mm:ss')}_`,
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'JWT')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const http_adapter = app.getHttpAdapter();

  const allowedCompanyIPs = process.env.API_DOCS_ALLOWED_COMPANY_IPS
    ? process.env.API_DOCS_ALLOWED_COMPANY_IPS.split(',')
    : [];

  // Add localhost IPs for development
  allowedCompanyIPs.push('127.0.0.1', '::1');

  http_adapter.use(
    '/api-docs',
    (req: Request, res: Response, next: NextFunction) => {
      function parseAuthHeader(input: string): { name: string; pass: string } {
        const [, encodedPart] = input.split(' ');
        const buff = Buffer.from(encodedPart, 'base64');
        const text = buff.toString('ascii');
        const [name, pass] = text.split(':');
        return { name, pass };
      }

      function unauthorizedResponse(): void {
        if (http_adapter.getType() === 'fastify') {
          res.statusCode = 401;
          res.setHeader('WWW-Authenticate', 'Basic');
        } else {
          res.status(401);
          res.set('WWW-Authenticate', 'Basic');
        }
        next();
      }

      const clientIp = getClientIp(req);

      // Allow whitelisted IPs without auth
      if (allowedCompanyIPs.includes(clientIp)) {
        return next();
      }

      if (!req.headers.authorization) {
        return unauthorizedResponse();
      }

      const credentials = parseAuthHeader(req.headers.authorization);

      if (
        credentials?.name !== api_documentation_credentials.name ||
        credentials?.pass !== api_documentation_credentials.pass
      ) {
        return unauthorizedResponse();
      }

      next();
    },
  );

  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: { persistAuthorization: true, docExpansion: 'none' },
    customJs: '/swagger-custom.js',
    customSiteTitle: 'Apollo API Documentation',
    customfavIcon: '/swagger.png',
  });
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip.startsWith('::ffff:') ? req.ip.substring(7) : req.ip;
}
