import { Module, Global } from '@nestjs/common';
import { SyncGateway } from './sync.gateway';

@Global()
@Module({
  providers: [SyncGateway],
  exports: [SyncGateway],
})
export class SyncModule {}
