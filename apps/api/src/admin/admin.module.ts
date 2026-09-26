import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { OrdersModule } from '../orders/orders.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { ServicesModule } from '../services/services.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { BannersController } from './banners.controller';

@Module({
  imports: [AuthModule, CatalogModule, OrdersModule, ReviewsModule, ServicesModule],
  controllers: [AdminController, BannersController],
  providers: [AdminService],
})
export class AdminModule {}
