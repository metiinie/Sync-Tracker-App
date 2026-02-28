"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const redis_io_adapter_1 = require("./sync/redis-io.adapter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe());
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
        try {
            const redisIoAdapter = new redis_io_adapter_1.RedisIoAdapter(app);
            await redisIoAdapter.connectToRedis();
            app.useWebSocketAdapter(redisIoAdapter);
            console.log('Successfully connected to Redis for WebSockets');
        }
        catch (error) {
            console.error('Failed to connect to Redis, falling back to default adapter:', error);
        }
    }
    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`Backend is listening on port ${port} (0.0.0.0)`);
}
bootstrap();
//# sourceMappingURL=main.js.map