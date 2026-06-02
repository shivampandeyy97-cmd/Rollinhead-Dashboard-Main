import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('api');

  // Use cookie-parser middleware for JWT secure cookies
  app.use(cookieParser());

  // Define allowed origins for CORS
  const allowedOrigins = [
    'http://localhost:3000',
    'https://shivampandeyy97-cmd.github.io',
    'https://dash.rollinhead.com',
    'https://frontend-production-aae5.up.railway.app',
  ];
  if (process.env.CORS_ORIGIN) {
    const extraOrigins = process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
    allowedOrigins.push(...extraOrigins);
  }

  // Support Private Network Access (PNA) CORS preflights
  app.use((req: any, res: any, next: any) => {
    if (req.headers['access-control-request-private-network']) {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
  });

  // Enable CORS with credentials support
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, Cookie',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(
    `🚀 Rollinhead Dashboard API is running on: http://localhost:${port}/api`,
  );
}
bootstrap();
