import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ServiceOfferInput } from '../shared/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceOffersService {
  constructor(private readonly prisma: PrismaService) {}
  list(admin = false) { return this.prisma.serviceOffer.findMany({ where: admin ? {} : { active: true }, orderBy: { createdAt: 'desc' } }); }
  async save(input: ServiceOfferInput, id?: string) {
    if (input.productId && !await this.prisma.product.findFirst({ where: { id: input.productId, active: true } })) throw new BadRequestException('Choose an active product');
    if (input.contractorId && !await this.prisma.contractorProfile.findFirst({ where: { id: input.contractorId, approvalStatus: 'APPROVED', user: { active: true } } })) throw new BadRequestException('Choose an approved technician');
    if (id && !await this.prisma.serviceOffer.findUnique({ where: { id } })) throw new NotFoundException('Offer not found');
    const data = { ...input, productId: input.productId ?? null, contractorId: input.contractorId ?? null, serviceType: input.serviceType ?? null };
    return id ? this.prisma.serviceOffer.update({ where: { id }, data }) : this.prisma.serviceOffer.create({ data });
  }
}

