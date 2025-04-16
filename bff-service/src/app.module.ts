import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.register({
      store: 'memory',
      max: 100,
      ttl: 120000, // Cache expiration time in milliseconds (2 minutes)
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
