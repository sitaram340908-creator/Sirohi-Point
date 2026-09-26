import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ContractorAdminDetails,
  ContractorProfileInput,
  NearbyContractor,
  NearbyContractorQuery,
  ServiceBookingInput,
} from '../shared/contracts';

import { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

export interface MemoryProfile extends ContractorProfileInput {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  verified: boolean;
  rating: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface MemoryBooking {
  id: string;
  customerId: string;
  contractorId?: string;
  serviceType: string;
  address: string;
  scheduledFor?: string;
  status: 'REQUESTED' | 'MATCHED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  approvalStatus: 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED';
  technicianResponse: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

@Injectable()
export class ServicesService {
  private readonly memoryProfiles = new Map<string, MemoryProfile>();
  private readonly memoryBookings: MemoryBooking[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async saveProfile(user: AuthenticatedUser, input: ContractorProfileInput) {
    if (!process.env.DATABASE_URL) {
      const profile: MemoryProfile = {
        id: this.memoryProfiles.get(user.id)?.id ?? randomUUID(),
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        ...input,
        verified: this.memoryProfiles.get(user.id)?.verified ?? false,
        rating: this.memoryProfiles.get(user.id)?.rating ?? 0,
        approvalStatus: this.memoryProfiles.get(user.id)?.approvalStatus ?? 'PENDING',
      };
      this.memoryProfiles.set(user.id, profile);
      return profile;
    }
    const profile = await this.prisma.contractorProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        skills: input.skills,
        serviceArea: input.serviceArea,
        latitude: input.latitude,
        longitude: input.longitude,
        serviceRadiusKm: input.serviceRadiusKm,
        experienceYears: input.experienceYears,
        bio: input.bio,
        availability: input.availability,
        services: { create: input.services },
      },
      update: {
        skills: input.skills,
        serviceArea: input.serviceArea,
        latitude: input.latitude,
        longitude: input.longitude,
        serviceRadiusKm: input.serviceRadiusKm,
        experienceYears: input.experienceYears,
        bio: input.bio,
        availability: input.availability,
        services: {
          deleteMany: {},
          create: input.services,
        },
      },
      include: { services: true },
    });
    return profile;
  }

  async getProfile(user: AuthenticatedUser): Promise<ContractorAdminDetails> {
    if (!process.env.DATABASE_URL) {
      const profile = this.memoryProfiles.get(user.id);
      if (!profile) throw new NotFoundException('Create a contractor profile first');
      return {
        id: profile.id, userId: profile.userId, name: profile.name, email: profile.email, phone: profile.phone,
        skills: profile.skills, serviceArea: profile.serviceArea, latitude: profile.latitude, longitude: profile.longitude,
        serviceRadiusKm: profile.serviceRadiusKm, experienceYears: profile.experienceYears, bio: profile.bio, rating: profile.rating,
        verified: profile.verified, approvalStatus: profile.approvalStatus, availability: profile.availability,
        services: profile.services.map((service, index) => ({ id: `${profile.id}-service-${index + 1}`, serviceType: service.serviceType, description: service.description, visitChargeInPaise: service.visitChargeInPaise, priceFromInPaise: service.priceFromInPaise, priceToInPaise: service.priceToInPaise })),
      };
    }
    const profile = await this.prisma.contractorProfile.findUnique({ where: { userId: user.id }, include: { user: true, services: true } });
    if (!profile) throw new NotFoundException('Create a contractor profile first');
    return this.toAdminDetails(profile);
  }

  async listContractorProfiles(): Promise<ContractorAdminDetails[]> {
    if (!process.env.DATABASE_URL) {
      return [...this.memoryProfiles.values()].map((profile) => ({
        id: profile.id, userId: profile.userId, name: profile.name, email: profile.email, phone: profile.phone,
        skills: profile.skills, serviceArea: profile.serviceArea, latitude: profile.latitude, longitude: profile.longitude,
        serviceRadiusKm: profile.serviceRadiusKm, experienceYears: profile.experienceYears, bio: profile.bio, rating: profile.rating,
        verified: profile.verified, approvalStatus: profile.approvalStatus, availability: profile.availability,
        services: profile.services.map((service, index) => ({ id: `${profile.id}-service-${index + 1}`, serviceType: service.serviceType, description: service.description, visitChargeInPaise: service.visitChargeInPaise, priceFromInPaise: service.priceFromInPaise, priceToInPaise: service.priceToInPaise })),
      }));
    }
    const profiles = await this.prisma.contractorProfile.findMany({ include: { user: true, services: true } });
    return profiles.map((profile) => this.toAdminDetails(profile));
  }

  async approveContractor(id: string) {
    if (!process.env.DATABASE_URL) {
      const profile = [...this.memoryProfiles.values()].find((item) => item.id === id);
      if (!profile) throw new NotFoundException('Contractor profile not found');
      profile.approvalStatus = 'APPROVED';
      profile.verified = true;
      this.auth.markContractorApproval(profile.userId, 'APPROVED');
      return profile;
    }
    const previous = await this.prisma.contractorProfile.findUnique({ where: { id } });
    if (!previous) throw new NotFoundException('Technician profile not found');
    const profile = await this.prisma.contractorProfile.update({ where: { id }, data: { approvalStatus: 'APPROVED', verified: true, ...(previous.approvalStatus === 'REJECTED' ? { availability: 'AVAILABLE' } : {}) } });
    this.auth.markContractorApproval(profile.userId, 'APPROVED');
    return profile;
  }

  async rejectContractor(id: string) {
    if (!process.env.DATABASE_URL) {
      const profile = [...this.memoryProfiles.values()].find((item) => item.id === id);
      if (!profile) throw new NotFoundException('Contractor profile not found');
      profile.approvalStatus = 'REJECTED';
      profile.verified = false;
      profile.availability = 'OFFLINE';
      this.auth.markContractorApproval(profile.userId, 'REJECTED');
      return profile;
    }
    const profile = await this.prisma.contractorProfile.update({ where: { id }, data: { approvalStatus: 'REJECTED', verified: false, availability: 'OFFLINE' } });
    this.auth.markContractorApproval(profile.userId, 'REJECTED');
    return profile;
  }

  async nearby(query: NearbyContractorQuery): Promise<NearbyContractor[]> {
    if (!process.env.DATABASE_URL) {
      return [...this.memoryProfiles.values()]
        .filter((profile) => profile.approvalStatus === 'APPROVED' && profile.availability === 'AVAILABLE')
        .filter((profile) => !query.serviceType || profile.services.some((service) => this.matchesRequestedService(service.serviceType, query.serviceType!)))
        .map((profile) => {
          const distanceKm = query.latitude !== undefined && query.longitude !== undefined && profile.latitude !== undefined && profile.longitude !== undefined
            ? this.distanceKm(query.latitude, query.longitude, profile.latitude, profile.longitude)
            : undefined;
          const isNearby = distanceKm !== undefined && distanceKm <= Math.min(query.radiusKm, profile.serviceRadiusKm);
          const areaMatches = Boolean(query.area && profile.serviceArea?.toLowerCase().includes(query.area.toLowerCase()));
          return { profile, distanceKm, isNearby, areaMatches };
        })
        .filter(({ isNearby, areaMatches }) => this.matchesNearbyQuery(query, isNearby, areaMatches))
        .sort((a, b) => this.compareNearbyContractors(a, b, Boolean(query.area)))
        .map(({ profile, distanceKm, isNearby }) => ({
          id: profile.id,
          userId: profile.userId,
          name: profile.name,
          serviceArea: profile.serviceArea,
          latitude: profile.latitude,
          longitude: profile.longitude,
          distanceKm: distanceKm === undefined ? undefined : Number(distanceKm.toFixed(2)),
          isNearby,
          rating: profile.rating,
          experienceYears: profile.experienceYears,
          availability: profile.availability,
          services: profile.services.map((service, index) => ({
            id: `${profile.id}-service-${index + 1}`,
            serviceType: service.serviceType,
            description: service.description,
            visitChargeInPaise: service.visitChargeInPaise,
            priceFromInPaise: service.priceFromInPaise,
            priceToInPaise: service.priceToInPaise,
          })),
        }));
    }
    const profiles = await this.prisma.contractorProfile.findMany({
      where: {
        approvalStatus: 'APPROVED',
        user: { active: true },
        availability: 'AVAILABLE',
        ...(query.serviceType ? { services: { some: { ...this.requestedServiceFilter(query.serviceType), active: true } } } : {}),
      },
      include: { user: true, services: { where: { active: true } } },
    });
    return profiles
      .map((profile) => {
        const distanceKm = query.latitude !== undefined && query.longitude !== undefined && profile.latitude !== null && profile.longitude !== null
          ? this.distanceKm(query.latitude, query.longitude, profile.latitude, profile.longitude)
          : undefined;
        const isNearby = distanceKm !== undefined && distanceKm <= Math.min(query.radiusKm, profile.serviceRadiusKm);
        const areaMatches = Boolean(query.area && profile.serviceArea?.toLowerCase().includes(query.area.toLowerCase()));
        return { profile, distanceKm, isNearby, areaMatches };
      })
      .filter(({ isNearby, areaMatches }) => this.matchesNearbyQuery(query, isNearby, areaMatches))
      .sort((a, b) => this.compareNearbyContractors(a, b, Boolean(query.area)))
      .map(({ profile, distanceKm, isNearby }) => ({
        id: profile.id,
        userId: profile.userId,
        name: profile.user.name,
        phone: profile.user.phone,
        serviceArea: profile.serviceArea ?? undefined,
        latitude: profile.latitude ?? undefined,
        longitude: profile.longitude ?? undefined,
        distanceKm: distanceKm === undefined ? undefined : Number(distanceKm.toFixed(2)),
        isNearby,
        rating: profile.rating,
        experienceYears: profile.experienceYears ?? undefined,
        availability: profile.availability,
        services: profile.services.map((service) => ({
          id: service.id,
          serviceType: service.serviceType,
          description: service.description ?? undefined,
          visitChargeInPaise: service.visitChargeInPaise,
          priceFromInPaise: service.priceFromInPaise ?? undefined,
          priceToInPaise: service.priceToInPaise ?? undefined,
        })),
      }));
  }

  private compareNearbyContractors(
    a: { profile: { rating: number }; distanceKm?: number; isNearby: boolean; areaMatches: boolean },
    b: { profile: { rating: number }; distanceKm?: number; isNearby: boolean; areaMatches: boolean },
    prioritizeArea: boolean,
  ) {
    if (prioritizeArea && a.areaMatches !== b.areaMatches) return a.areaMatches ? -1 : 1;
    const aRank = a.isNearby ? 0 : a.distanceKm === undefined ? 2 : 1;
    const bRank = b.isNearby ? 0 : b.distanceKm === undefined ? 2 : 1;
    return aRank - bRank || (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER) || b.profile.rating - a.profile.rating;
  }

  private matchesNearbyQuery(query: NearbyContractorQuery, isNearby: boolean, areaMatches: boolean) {
    if (!query.nearbyOnly) return true;
    // Coordinates are the most precise form of the existing location logic.
    // For an area-only search, retain the established service-area matching
    // behavior so customers without geocoded addresses can still use Nearby.
    if (query.latitude !== undefined && query.longitude !== undefined) return isNearby;
    if (query.area) return areaMatches;
    return true;
  }

  private matchesRequestedService(serviceType: string, requestedServiceType: string) {
    const service = serviceType.trim().toLowerCase();
    const requested = requestedServiceType.trim().toLowerCase();
    return service === requested || (requested.includes('electrician') && ['electrician', 'electrical', 'wiring'].some((term) => service.includes(term)));
  }

  private requestedServiceFilter(serviceType: string) {
    return serviceType.trim().toLowerCase().includes('electrician')
      ? { OR: ['electrician', 'electrical', 'wiring'].map((term) => ({ serviceType: { contains: term, mode: 'insensitive' as const } })) }
      : { serviceType: { equals: serviceType, mode: 'insensitive' as const } };
  }

  async createBooking(customerId: string, input: ServiceBookingInput) {
    if (!input.contractorId) throw new BadRequestException('Choose a technician before booking');
    if (input.scheduledFor && new Date(input.scheduledFor) <= new Date()) throw new BadRequestException('Preferred date must be in the future');
    if (!process.env.DATABASE_URL) {
      const booking: MemoryBooking = {
        id: `demo-booking-${randomUUID()}`,
        customerId,
        contractorId: input.contractorId,
        serviceType: input.serviceType,
        address: input.address,
        scheduledFor: input.scheduledFor,
        status: 'REQUESTED',
        approvalStatus: 'PENDING_ADMIN',
        technicianResponse: 'PENDING',
      };
      this.memoryBookings.unshift(booking);
      return booking;
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const profile = await tx.contractorProfile.findFirst({ where: { id: input.contractorId, approvalStatus: 'APPROVED', availability: 'AVAILABLE', user: { active: true } }, include: { services: { where: { active: true } } } });
        const service = profile?.services.find((item) => item.serviceType.toLowerCase() === input.serviceType.toLowerCase());
        if (!service) throw new BadRequestException('This technician is not available for the selected service');
        const savedAddress = input.addressId ? await tx.customerAddress.findFirst({ where: { id: input.addressId, userId: customerId } }) : null;
        if (input.addressId && !savedAddress) throw new BadRequestException('Choose one of your saved addresses');
        let discountInPaise = 0;
        const offer = input.offerId ? await tx.serviceOffer.findUnique({ where: { id: input.offerId } }) : null;
        if (input.offerId) {
          if (!offer?.active || (offer.contractorId && offer.contractorId !== profile!.id) || (offer.serviceType && offer.serviceType.toLowerCase() !== service.serviceType.toLowerCase())) throw new BadRequestException('This offer is not valid for the selected service or technician');
          if (offer.productId) {
            const order = input.orderId ? await tx.order.findFirst({ where: { id: input.orderId, customerId, status: 'DELIVERED', approvalStatus: 'APPROVED', items: { some: { productId: offer.productId } }, booking: null } }) : null;
            if (!order) throw new BadRequestException('This offer requires your delivered product order that has not already been used for a booking');
          }
          discountInPaise = Math.min(service.visitChargeInPaise, offer.discountInPaise);
        }
        return tx.serviceBooking.create({ data: {
          customerId, contractorId: profile!.id, serviceType: service.serviceType,
          address: savedAddress ? [savedAddress.line1, savedAddress.city, savedAddress.state, savedAddress.postalCode].filter(Boolean).join(', ') : input.address,
          addressId: savedAddress?.id,
          scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
          customerLatitude: savedAddress?.latitude ?? input.customerLatitude, customerLongitude: savedAddress?.longitude ?? input.customerLongitude, notes: input.notes,
          requestedPriceInPaise: service.visitChargeInPaise, finalPriceInPaise: service.visitChargeInPaise - discountInPaise,
          discountInPaise, offerId: offer?.id, offerTitle: offer?.title,
          orderId: offer?.productId ? input.orderId : undefined,
        } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) throw new BadRequestException('The offer or order changed while booking. Refresh and try again; a product order can only be used once.');
      throw error;
    }
  }

  async publicProfile(id: string) {
    const profile = await this.prisma.contractorProfile.findFirst({ where: { id, approvalStatus: 'APPROVED', user: { active: true } }, include: { user: true, services: { where: { active: true } } } });
    if (!profile) throw new NotFoundException('Approved technician not found');
    return this.toAdminDetails(profile);
  }

  async listForCustomer(customerId: string) {
    if (!process.env.DATABASE_URL) return this.memoryBookings.filter((booking) => booking.customerId === customerId);
    return this.prisma.serviceBooking.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' }, include: { contractor: { select: { serviceArea: true, user: { select: { name: true } } } } } });
  }

  async listForContractor(user: AuthenticatedUser) {
    if (!process.env.DATABASE_URL) {
      const profile = this.memoryProfiles.get(user.id);
      return profile?.approvalStatus === 'APPROVED' ? this.memoryBookings.filter((booking) => booking.contractorId === profile.id && booking.approvalStatus === 'APPROVED') : [];
    }
    const profile = await this.prisma.contractorProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new NotFoundException('Create a contractor profile first');
    if (profile.approvalStatus !== 'APPROVED') return [];
    return this.prisma.serviceBooking.findMany({ where: { contractorId: profile.id, approvalStatus: 'APPROVED' }, orderBy: { createdAt: 'desc' } });
  }

  async listForAdmin() {
    if (!process.env.DATABASE_URL) return [...this.memoryBookings];
    return this.prisma.serviceBooking.findMany({ orderBy: { createdAt: 'desc' }, include: { customer: { select: { name: true, email: true } }, contractor: { select: { user: { select: { name: true } } } } } });
  }

  async approveBooking(id: string, adminId: string) {
    if (!process.env.DATABASE_URL) {
      const booking = this.memoryBookings.find((item) => item.id === id);
      if (!booking) throw new NotFoundException('Service booking not found');
      booking.approvalStatus = 'APPROVED';
      booking.status = 'MATCHED';
      return booking;
    }
    const changed = await this.prisma.serviceBooking.updateMany({ where: { id, approvalStatus: 'PENDING_ADMIN', status: 'REQUESTED', contractor: { approvalStatus: 'APPROVED', user: { active: true } } }, data: { approvalStatus: 'APPROVED', status: 'MATCHED', approvedById: adminId, approvedAt: new Date() } });
    if (!changed.count) throw new BadRequestException('Request is no longer pending or the technician is not approved');
    return this.prisma.serviceBooking.findUnique({ where: { id } });
  }

  async rejectBooking(id: string, reason?: string) {
    if (!process.env.DATABASE_URL) {
      const booking = this.memoryBookings.find((item) => item.id === id);
      if (!booking) throw new NotFoundException('Service booking not found');
      booking.approvalStatus = 'REJECTED';
      booking.status = 'CANCELLED';
      return booking;
    }
    const changed = await this.prisma.serviceBooking.updateMany({ where: { id, approvalStatus: 'PENDING_ADMIN', status: 'REQUESTED' }, data: { approvalStatus: 'REJECTED', status: 'CANCELLED', rejectionReason: reason } });
    if (!changed.count) throw new BadRequestException('Only pending requests can be rejected');
    return this.prisma.serviceBooking.findUnique({ where: { id } });
  }

  async respondAsTechnician(id: string, userId: string, accept: boolean) {
    if (!process.env.DATABASE_URL) {
      const profile = this.memoryProfiles.get(userId);
      if (!profile) throw new NotFoundException('Contractor profile not found');
      if (profile.approvalStatus !== 'APPROVED') throw new ForbiddenException('Your contractor profile is waiting for admin approval');
      const booking = this.memoryBookings.find((item) => item.id === id && item.contractorId === profile?.id);
      if (!booking) throw new NotFoundException('Service booking not found');
      booking.technicianResponse = accept ? 'ACCEPTED' : 'REJECTED';
      booking.status = accept ? 'CONFIRMED' : 'CANCELLED';
      return booking;
    }
    const profile = await this.prisma.contractorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Contractor profile not found');
    if (profile.approvalStatus !== 'APPROVED') throw new ForbiddenException('Your contractor profile is waiting for admin approval');
    const booking = await this.prisma.serviceBooking.findFirst({ where: { id, contractorId: profile.id, approvalStatus: 'APPROVED' } });
    if (!booking) throw new NotFoundException('Approved service booking not found');
    const changed = await this.prisma.serviceBooking.updateMany({ where: { id, contractorId: profile.id, approvalStatus: 'APPROVED', technicianResponse: 'PENDING', status: 'MATCHED' }, data: { technicianResponse: accept ? 'ACCEPTED' : 'REJECTED', status: accept ? 'CONFIRMED' : 'CANCELLED', acceptedAt: accept ? new Date() : null } });
    if (!changed.count) throw new BadRequestException('This request has already been answered');
    return this.prisma.serviceBooking.findUnique({ where: { id } });
  }

  async confirmCompletionAsCustomer(id: string, customerId: string) {
    if (!process.env.DATABASE_URL) {
      const booking = this.memoryBookings.find((item) => item.id === id && item.customerId === customerId);
      if (!booking) throw new NotFoundException('Service booking not found');
      if (booking.approvalStatus !== 'APPROVED' || booking.technicianResponse !== 'ACCEPTED' || booking.status !== 'CONFIRMED') {
        throw new BadRequestException('Only an accepted service request can be marked complete by the customer');
      }
      booking.status = 'IN_PROGRESS';
      return booking;
    }
    const changed = await this.prisma.serviceBooking.updateMany({
      where: { id, customerId, approvalStatus: 'APPROVED', technicianResponse: 'ACCEPTED', status: 'CONFIRMED' },
      data: { status: 'IN_PROGRESS' },
    });
    if (!changed.count) throw new BadRequestException('Only an accepted service request can be marked complete by the customer');
    return this.prisma.serviceBooking.findUnique({ where: { id } });
  }

  async completeAsTechnician(id: string, userId: string) {
    if (!process.env.DATABASE_URL) {
      const profile = this.memoryProfiles.get(userId);
      if (!profile) throw new NotFoundException('Contractor profile not found');
      if (profile.approvalStatus !== 'APPROVED') throw new ForbiddenException('Your contractor profile is waiting for admin approval');
      const booking = this.memoryBookings.find((item) => item.id === id && item.contractorId === profile?.id);
      if (!booking) throw new NotFoundException('Service booking not found');
      if (booking.approvalStatus !== 'APPROVED' || booking.technicianResponse !== 'ACCEPTED' || booking.status !== 'IN_PROGRESS') {
        throw new BadRequestException('The customer must mark this request complete before you can complete it');
      }
      booking.status = 'COMPLETED';
      return booking;
    }
    const profile = await this.prisma.contractorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Contractor profile not found');
    if (profile.approvalStatus !== 'APPROVED') throw new ForbiddenException('Your contractor profile is waiting for admin approval');
    const changed = await this.prisma.serviceBooking.updateMany({ where: { id, contractorId: profile.id, approvalStatus: 'APPROVED', technicianResponse: 'ACCEPTED', status: 'IN_PROGRESS' }, data: { status: 'COMPLETED' } });
    if (!changed.count) throw new BadRequestException('The customer must mark this request complete before you can complete it');
    return this.prisma.serviceBooking.findUnique({ where: { id } });
  }

  private distanceKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(latitudeB - latitudeA);
    const dLon = this.toRadians(longitudeB - longitudeA);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.toRadians(latitudeA)) * Math.cos(this.toRadians(latitudeB)) * Math.sin(dLon / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(value: number) {
    return value * (Math.PI / 180);
  }

  private toAdminDetails(profile: {
    id: string;
    userId: string;
    skills: string[];
    serviceArea: string | null;
    latitude: number | null;
    longitude: number | null;
    serviceRadiusKm: number;
    experienceYears: number | null;
    bio: string | null;
    rating: number;
    verified: boolean;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
    user: { name: string; email: string | null; phone: string | null };
    services: Array<{ id: string; serviceType: string; description: string | null; visitChargeInPaise: number; priceFromInPaise: number | null; priceToInPaise: number | null }>;
  }): ContractorAdminDetails {
    return {
      id: profile.id, userId: profile.userId, name: profile.user.name, email: profile.user.email, phone: profile.user.phone,
      skills: profile.skills, serviceArea: profile.serviceArea, latitude: profile.latitude, longitude: profile.longitude,
      serviceRadiusKm: profile.serviceRadiusKm, experienceYears: profile.experienceYears, bio: profile.bio, rating: profile.rating,
      verified: profile.verified, approvalStatus: profile.approvalStatus, availability: profile.availability,
      services: profile.services.map((service) => ({ id: service.id, serviceType: service.serviceType, description: service.description ?? undefined, visitChargeInPaise: service.visitChargeInPaise, priceFromInPaise: service.priceFromInPaise ?? undefined, priceToInPaise: service.priceToInPaise ?? undefined })),
    };
  }
}

