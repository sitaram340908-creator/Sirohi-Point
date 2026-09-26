import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { ServiceOffersService } from './service-offers.service';
import { AdminServiceOffersController, PublicServiceOffersController } from './service-offers.controller';

@Module({
  imports: [AuthModule],
  controllers: [ServicesController, AdminServiceOffersController, PublicServiceOffersController],
  providers: [ServicesService, ServiceOffersService],
  exports: [ServicesService],
})
export class ServicesModule {}
