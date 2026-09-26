import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      this.logger.warn(
        'DATABASE_URL is not set; API will use its safe demonstration catalog.',
      );
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    if (process.env.DATABASE_URL) await this.$disconnect();
  }
}
