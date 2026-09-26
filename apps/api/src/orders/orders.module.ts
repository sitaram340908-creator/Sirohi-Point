import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { RazorpayService } from './razorpay.service';

@Module({
  imports: [AuthModule, CatalogModule],
  controllers: [OrdersController],
  providers: [OrdersService, RazorpayService],
  exports: [OrdersService],
})
export class OrdersModule {}
