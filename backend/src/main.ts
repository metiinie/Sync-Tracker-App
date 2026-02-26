import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { RedisIoAdapter } from './sync/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe());

  // Use Redis adapter for Socket.IO if REDIS_URL is provided
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const redisIoAdapter = new RedisIoAdapter(app);
      await redisIoAdapter.connectToRedis();
      app.useWebSocketAdapter(redisIoAdapter);
      console.log('Successfully connected to Redis for WebSockets');
    } catch (error) {
      console.error('Failed to connect to Redis, falling back to default adapter:', error);
    }
  }

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
