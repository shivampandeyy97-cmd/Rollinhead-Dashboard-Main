import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  // Run admin credentials update on startup
  try {
    const prismaInstance = new PrismaClient();
    console.log('[STARTUP] Checking admin credentials in database...');
    
    // Hash target password
    const targetHash = await bcrypt.hash('admin123', 10);
    
    // 1. Find the old admin accounts
    const oldEmails = ['admin@rollinhead.com', 'admin@rollinehead.com'];
    for (const oldEmail of oldEmails) {
      const oldUser = await prismaInstance.user.findUnique({
        where: { email: oldEmail },
      });
      if (oldUser) {
        console.log(`[STARTUP] Found old admin account: ${oldEmail}. Updating to contact@rollinhead.com...`);
        // Check if contact@rollinhead.com already exists
        const contactUser = await prismaInstance.user.findUnique({
          where: { email: 'contact@rollinhead.com' },
        });
        if (contactUser) {
          // Update contactUser
          await prismaInstance.user.update({
            where: { id: contactUser.id },
            data: {
              passwordHash: targetHash,
              role: UserRole.SUPER_ADMIN,
              isActive: true,
            },
          });
          if (oldUser.id !== contactUser.id) {
            // Transfer relationships to contactUser
            await prismaInstance.auditLog.updateMany({
              where: { userId: oldUser.id },
              data: { userId: contactUser.id },
            });
            await prismaInstance.uploadLog.updateMany({
              where: { uploadedBy: oldUser.id },
              data: { uploadedBy: contactUser.id },
            });
            await prismaInstance.notification.updateMany({
              where: { createdBy: oldUser.id },
              data: { createdBy: contactUser.id },
            });
            await prismaInstance.notificationRead.updateMany({
              where: { userId: oldUser.id },
              data: { userId: contactUser.id },
            });
            await prismaInstance.revenueShareConfig.updateMany({
              where: { createdBy: oldUser.id },
              data: { createdBy: contactUser.id },
            });
            // Delete old user safely
            await prismaInstance.user.delete({
              where: { id: oldUser.id },
            });
            console.log(`[STARTUP] Safely merged and deleted duplicate admin ${oldEmail}`);
          }
        } else {
          // Just change email of oldUser
          await prismaInstance.user.update({
            where: { id: oldUser.id },
            data: {
              email: 'contact@rollinhead.com',
              passwordHash: targetHash,
              role: UserRole.SUPER_ADMIN,
              isActive: true,
            },
          });
          console.log(`[STARTUP] Successfully updated admin ${oldEmail} to contact@rollinhead.com`);
        }
      }
    }

    // 2. Ensure contact@rollinhead.com exists as Super Admin
    const finalAdmin = await prismaInstance.user.findUnique({
      where: { email: 'contact@rollinhead.com' },
    });
    if (!finalAdmin) {
      await prismaInstance.user.create({
        data: {
          email: 'contact@rollinhead.com',
          name: 'Rollinhead Admin',
          passwordHash: targetHash,
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        },
      });
      console.log('[STARTUP] Created new contact@rollinhead.com admin user');
    } else {
      // Ensure password is correct and user is active
      await prismaInstance.user.update({
        where: { id: finalAdmin.id },
        data: {
          passwordHash: targetHash,
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        },
      });
      console.log('[STARTUP] Verified contact@rollinhead.com credentials are set correctly');
    }
    
    await prismaInstance.$disconnect();
  } catch (startupError) {
    console.error('[STARTUP] Error verifying/running admin credentials startup update:', startupError);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(
    `🚀 Rollinhead Dashboard API is running on: http://localhost:${port}/api`,
  );
}
bootstrap();
