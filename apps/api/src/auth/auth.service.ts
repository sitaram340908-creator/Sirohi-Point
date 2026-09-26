import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  AdminBusinessDetails,
  AuthSession,
  BusinessRegisterInput,
  BusinessProfileDetails,
  CustomerProfileUpdate,
  CustomerRegisterInput,
  ContractorRegisterInput,
  LoginInput,
  PlatformRole,
  PublicUser,
} from '../shared/contracts';
import { adminPermissionKeys, type AdminPermissionKey } from '../shared/contracts';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from './auth.types';
import { hashPassword, verifyPassword } from './password';
import { signAuthToken, verifyAuthToken } from './token';

interface MemoryUser extends AuthenticatedUser {
  passwordHash: string;
  contractorApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  businessProfile?: BusinessProfileDetails;
}

interface MemoryContractorProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  skills: string[];
  serviceArea?: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm: number;
  experienceYears?: number;
  bio?: string;
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  verified: boolean;
  rating: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  services: Array<{ serviceType: string; description?: string; visitChargeInPaise: number; priceFromInPaise?: number; priceToInPaise?: number; active: boolean }>;
}

@Injectable()
export class AuthService {
  private readonly memoryUsers = new Map<string, MemoryUser>();
  private readonly memoryContractorProfiles = new Map<string, MemoryContractorProfile>();
  private memoryAdminReady: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async register(input: CustomerRegisterInput): Promise<AuthSession> {
    const email = input.email.toLowerCase();
    const phone = input.phone?.trim() || undefined;
    const passwordHash = await hashPassword(input.password);

    if (!process.env.DATABASE_URL) {
      await this.ensureMemoryAdmin();
      if ([...this.memoryUsers.values()].some((user) => user.email === email)) {
        throw new ConflictException('An account already exists for this email');
      }
      const user: MemoryUser = {
        id: randomUUID(),
        name: input.name,
        email,
        phone,
        customerLocation: input.customerLocation,
        role: 'CUSTOMER',
        active: true,
        createdAt: new Date().toISOString(),
        passwordHash,
      };
      this.memoryUsers.set(user.id, user);
      return this.createSession(user);
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing)
      throw new ConflictException('An account already exists for this email');
    try {
      const record = await this.prisma.user.create({
        data: {
          name: input.name,
          email,
          phone,
          customerLocation: input.customerLocation,
          passwordHash,
          role: 'CUSTOMER',
        },
      });
      return this.createSession(this.fromRecord(record));
    } catch (error) {
      this.throwRegistrationConstraint(error);
    }
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const email = input.email.toLowerCase();
    if (!process.env.DATABASE_URL) {
      await this.ensureMemoryAdmin();
      const user = [...this.memoryUsers.values()].find(
        (item) => item.email === email,
      );
      if (
        !user ||
        !user.active ||
        !(await verifyPassword(input.password, user.passwordHash))
      ) {
        throw new UnauthorizedException('Invalid email or password');
      }
      await this.assertContractorApproval(user);
      await this.assertBusinessApproval(user);
      return this.createSession(user);
    }

    const record = await this.prisma.user.findUnique({
      where: { email },
      include: {
        contractorProfile: { select: { approvalStatus: true } },
        businessProfile: { select: { approvalStatus: true } },
      },
    });
    if (
      !record?.passwordHash ||
      !record.active ||
      !(await verifyPassword(input.password, record.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const user = this.fromRecord(record);
    await this.assertContractorApproval(user);
    await this.assertBusinessApproval(user);
    return this.createSession(user);
  }

  async registerBusiness(input: BusinessRegisterInput): Promise<AuthSession> {
    const email = input.email.toLowerCase();
    const phone = input.phone?.trim() || undefined;
    const passwordHash = await hashPassword(input.password);
    if (!process.env.DATABASE_URL) {
      await this.ensureMemoryAdmin();
      if ([...this.memoryUsers.values()].some((user) => user.email === email)) {
        throw new ConflictException('An account already exists for this email');
      }
      const user: MemoryUser = {
        id: randomUUID(),
        name: input.name,
        email,
        phone,
        role: 'BUSINESS',
        active: true,
        createdAt: new Date().toISOString(),
        passwordHash,
        businessProfile: {
          id: randomUUID(),
          userId: '',
          businessName: input.businessName,
          ...(input.businessType ? { businessType: input.businessType } : {}),
          ...(input.gstin ? { gstin: input.gstin } : {}),
          billingAddress: input.billingAddress ?? '',
          ...(input.shippingAddress ? { shippingAddress: input.shippingAddress } : {}),
          approvalStatus: 'PENDING',
          verified: false,
        },
      };
      user.businessProfile!.userId = user.id;
      this.memoryUsers.set(user.id, user);
      return this.createSession(user);
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An account already exists for this email');
    try {
      const user = await this.prisma.user.create({
        data: {
          name: input.name,
          email,
          phone,
          passwordHash,
          role: 'BUSINESS',
          businessProfile: {
            create: {
              businessName: input.businessName,
              businessType: input.businessType,
              gstin: input.gstin?.trim() || null,
              billingAddress: input.billingAddress ?? '',
              shippingAddress: input.shippingAddress,
              approvalStatus: 'PENDING',
              verified: false,
            },
          },
        },
      });
      return this.createSession(this.fromRecord(user));
    } catch (error) {
      this.throwRegistrationConstraint(error);
    }
  }

  async registerContractor(input: ContractorRegisterInput): Promise<AuthSession> {
    const email = input.email.toLowerCase();
    const phone = input.phone?.trim() || undefined;
    const passwordHash = await hashPassword(input.password);
    if (!process.env.DATABASE_URL) {
      await this.ensureMemoryAdmin();
      if ([...this.memoryUsers.values()].some((user) => user.email === email)) {
        throw new ConflictException('An account already exists for this email');
      }
      const user: MemoryUser = {
        id: randomUUID(),
        name: input.name,
        email,
        phone,
        role: 'CONTRACTOR',
        active: true,
        createdAt: new Date().toISOString(),
        passwordHash,
        contractorApprovalStatus: 'PENDING',
      };
      this.memoryUsers.set(user.id, user);
      const profileId = randomUUID();
      this.memoryContractorProfiles.set(user.id, {
        id: profileId,
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        skills: input.skills,
        serviceArea: input.serviceArea,
        latitude: input.latitude,
        longitude: input.longitude,
        serviceRadiusKm: input.serviceRadiusKm,
        experienceYears: input.experienceYears,
        bio: input.bio,
        availability: input.availability,
        verified: false,
        rating: 0,
        approvalStatus: 'PENDING',
        services: input.services,
      });
      return this.createSession(user);
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An account already exists for this email');
    try {
      const user = await this.prisma.user.create({
        data: {
          name: input.name,
          email,
          phone,
          passwordHash,
          role: 'CONTRACTOR',
          contractorProfile: {
            create: {
              skills: input.skills,
              serviceArea: input.serviceArea,
              latitude: input.latitude,
              longitude: input.longitude,
              serviceRadiusKm: input.serviceRadiusKm,
              experienceYears: input.experienceYears,
              bio: input.bio,
              availability: input.availability,
              approvalStatus: 'PENDING',
              verified: false,
              services: { create: input.services },
            },
          },
        },
      });
      return this.createSession(this.fromRecord(user));
    } catch (error) {
      this.throwRegistrationConstraint(error);
    }
  }

  async resolveToken(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = verifyAuthToken(token);
      const user = await this.findById(payload.sub);
      if (
        !user ||
        !user.active ||
        user.email !== payload.email ||
        user.role !== payload.role
      ) {
        throw new Error('Session no longer valid');
      }
      await this.assertContractorApproval(user);
      await this.assertBusinessApproval(user);
      return user;
    } catch {
      throw new UnauthorizedException('Your session is invalid or has expired');
    }
  }

  async refreshSession(user: AuthenticatedUser): Promise<AuthSession> {
    return this.createSession(user);
  }

  async updateCustomerProfile(userId: string, input: CustomerProfileUpdate): Promise<AuthSession> {
    const email = input.email.toLowerCase();
    const phone = input.phone?.trim() || undefined;
    if (!process.env.DATABASE_URL) {
      await this.ensureMemoryAdmin();
      const user = this.memoryUsers.get(userId);
      if (!user) throw new NotFoundException('Customer account not found');
      if ([...this.memoryUsers.values()].some((item) => item.id !== userId && item.email === email)) {
        throw new ConflictException('This email is already registered');
      }
      if (phone && [...this.memoryUsers.values()].some((item) => item.id !== userId && item.phone === phone)) {
        throw new ConflictException('This phone number is already registered');
      }
      user.name = input.name;
      user.email = email;
      user.phone = phone;
      return this.createSession(user);
    }
    try {
      const record = await this.prisma.user.update({ where: { id: userId }, data: { name: input.name, email, phone: phone ?? null } });
      return this.createSession(this.fromRecord(record));
    } catch (error) {
      this.throwRegistrationConstraint(error);
    }
  }

  markContractorApproval(userId: string, approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED') {
    const user = this.memoryUsers.get(userId);
    if (user?.role === 'CONTRACTOR') {
      user.contractorApprovalStatus = approvalStatus;
      const profile = this.memoryContractorProfiles.get(userId);
      if (profile) {
        profile.approvalStatus = approvalStatus;
        profile.verified = approvalStatus === 'APPROVED';
        profile.availability = approvalStatus === 'REJECTED' ? 'OFFLINE' : profile.availability;
      }
    }
  }

  getContractorProfiles(): MemoryContractorProfile[] {
    return [...this.memoryContractorProfiles.values()];
  }

  async listBusinessProfiles(): Promise<AdminBusinessDetails[]> {
    if (!process.env.DATABASE_URL) {
      await this.ensureMemoryAdmin();
      return [...this.memoryUsers.values()]
        .filter((user) => user.role === 'BUSINESS' && user.businessProfile)
        .map((user) => this.toBusinessDetails(user, user.businessProfile!));
    }

    const records = await this.prisma.businessProfile.findMany({
      include: { user: true },
      orderBy: { user: { createdAt: 'desc' } },
    });
    return records.map((record) => this.toBusinessDetails(record.user, {
      id: record.id,
      userId: record.userId,
      businessName: record.businessName,
      ...(record.businessType ? { businessType: record.businessType } : {}),
      ...(record.gstin ? { gstin: record.gstin } : {}),
      billingAddress: record.billingAddress,
      ...(record.shippingAddress ? { shippingAddress: record.shippingAddress } : {}),
      approvalStatus: this.normalizeBusinessApproval(record.approvalStatus),
      verified: record.verified,
    }));
  }

  async getBusinessProfile(user: AuthenticatedUser): Promise<BusinessProfileDetails> {
    if (!process.env.DATABASE_URL) {
      await this.ensureMemoryAdmin();
      const profile = this.memoryUsers.get(user.id)?.businessProfile;
      if (!profile) throw new NotFoundException('Business profile not found');
      return profile;
    }
    const profile = await this.prisma.businessProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new NotFoundException('Business profile not found');
    return {
      id: profile.id, userId: profile.userId, businessName: profile.businessName,
      ...(profile.businessType ? { businessType: profile.businessType } : {}),
      ...(profile.gstin ? { gstin: profile.gstin } : {}),
      billingAddress: profile.billingAddress, ...(profile.shippingAddress ? { shippingAddress: profile.shippingAddress } : {}),
      approvalStatus: this.normalizeBusinessApproval(profile.approvalStatus), verified: profile.verified,
    };
  }

  async updateBusinessApproval(id: string, approvalStatus: 'APPROVED' | 'REJECTED'): Promise<AdminBusinessDetails> {
    if (!process.env.DATABASE_URL) {
      await this.ensureMemoryAdmin();
      const user = [...this.memoryUsers.values()].find((item) => item.businessProfile?.id === id);
      if (!user?.businessProfile) throw new NotFoundException('Business registration not found');
      user.businessProfile.approvalStatus = approvalStatus;
      user.businessProfile.verified = approvalStatus === 'APPROVED';
      return this.toBusinessDetails(user, user.businessProfile);
    }

    const record = await this.prisma.businessProfile.update({
      where: { id },
      data: { approvalStatus, verified: approvalStatus === 'APPROVED' },
      include: { user: true },
    });
    return this.toBusinessDetails(record.user, {
      id: record.id,
      userId: record.userId,
      businessName: record.businessName,
      ...(record.businessType ? { businessType: record.businessType } : {}),
      ...(record.gstin ? { gstin: record.gstin } : {}),
      billingAddress: record.billingAddress,
      ...(record.shippingAddress ? { shippingAddress: record.shippingAddress } : {}),
      approvalStatus: this.normalizeBusinessApproval(record.approvalStatus),
      verified: record.verified,
    });
  }

  async listUsers(): Promise<AuthenticatedUser[]> {
    if (!process.env.DATABASE_URL) {
      await this.ensureMemoryAdmin();
      return [...this.memoryUsers.values()].map((user) =>
        this.toPublicUser(user),
      );
    }
    const records = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records
      .filter((record) => Boolean(record.email))
      .map((record) => this.fromRecord(record));
  }

  async deactivateUser(
    id: string,
    actingAdminId: string,
  ): Promise<AuthenticatedUser> {
    if (id === actingAdminId)
      throw new ConflictException('You cannot remove your own admin access');
    if (!process.env.DATABASE_URL) {
      await this.ensureMemoryAdmin();
      const user = this.memoryUsers.get(id);
      if (!user) throw new ConflictException('User not found');
      user.active = false;
      return this.toPublicUser(user);
    }
    const record = await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
    return this.fromRecord(record);
  }

  async activateUser(
    id: string,
    actingAdminId: string,
  ): Promise<AuthenticatedUser> {
    if (id === actingAdminId)
      throw new ConflictException('Your admin access is already active');
    if (!process.env.DATABASE_URL) {
      await this.ensureMemoryAdmin();
      const user = this.memoryUsers.get(id);
      if (!user) throw new ConflictException('User not found');
      user.active = true;
      return this.toPublicUser(user);
    }
    const record = await this.prisma.user.update({
      where: { id },
      data: { active: true },
    });
    return this.fromRecord(record);
  }

  private async findById(id: string): Promise<AuthenticatedUser | null> {
    if (!process.env.DATABASE_URL) {
      await this.ensureMemoryAdmin();
      const user = this.memoryUsers.get(id);
      return user ? this.toPublicUser(user) : null;
    }
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record?.email ? this.fromRecord(record) : null;
  }

  private throwRegistrationConstraint(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes('phone')) throw new ConflictException('This phone number is already registered');
      if (Array.isArray(target) && target.includes('gstin')) throw new ConflictException('This GSTIN is already registered');
      if (Array.isArray(target) && target.includes('email')) throw new ConflictException('This email is already registered');
    }
    throw error;
  }

  private async assertContractorApproval(user: AuthenticatedUser): Promise<void> {
    if (user.role !== 'CONTRACTOR') return;
    const approvalStatus = process.env.DATABASE_URL
      ? (await this.prisma.contractorProfile.findUnique({
          where: { userId: user.id },
          select: { approvalStatus: true },
        }))?.approvalStatus
      : this.memoryUsers.get(user.id)?.contractorApprovalStatus;
    if (approvalStatus === 'APPROVED') return;
    if (approvalStatus === 'REJECTED') {
      throw new ForbiddenException('Your technician registration was rejected by an administrator');
    }
    throw new ForbiddenException('Your technician account is awaiting admin approval');
  }

  private async assertBusinessApproval(user: AuthenticatedUser): Promise<void> {
    if (user.role !== 'BUSINESS') return;
    const approvalStatus = process.env.DATABASE_URL
      ? (await this.prisma.businessProfile.findUnique({
          where: { userId: user.id },
          select: { approvalStatus: true },
        }))?.approvalStatus
      : this.memoryUsers.get(user.id)?.businessProfile?.approvalStatus;
    if (approvalStatus === 'APPROVED') return;
    if (approvalStatus === 'REJECTED') {
      throw new ForbiddenException('Your business registration was rejected by an administrator');
    }
    throw new ForbiddenException('Your business account is awaiting admin approval');
  }

  private normalizeBusinessApproval(status: string): 'PENDING' | 'APPROVED' | 'REJECTED' {
    return status === 'APPROVED' || status === 'REJECTED' ? status : 'PENDING';
  }

  private toBusinessDetails(
    user: { id: string; name: string; email: string | null; phone?: string | null; createdAt: Date | string },
    profile: BusinessProfileDetails,
  ): AdminBusinessDetails {
    if (!user.email) throw new UnauthorizedException('This account cannot use email login');
    return {
      ...profile,
      name: user.name,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    };
  }

  private createSession(user: AuthenticatedUser): AuthSession {
    return {
      token: signAuthToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: AuthenticatedUser): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      customerLocation: user.customerLocation,
      role: user.role,
      ...(user.adminPermissions ? { adminPermissions: user.adminPermissions } : {}),
      active: user.active,
      createdAt: user.createdAt,
    };
  }

  private fromRecord(record: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    customerLocation: string | null;
    role: PlatformRole;
    adminPermissions?: unknown;
    active: boolean;
    createdAt: Date;
  }): AuthenticatedUser {
    if (!record.email)
      throw new UnauthorizedException('This account cannot use email login');
    return {
      id: record.id,
      name: record.name,
      email: record.email,
      phone: record.phone,
      customerLocation: record.customerLocation,
      role: record.role,
      ...(Array.isArray(record.adminPermissions)
        ? { adminPermissions: record.adminPermissions.filter((permission): permission is AdminPermissionKey => typeof permission === 'string' && adminPermissionKeys.includes(permission as AdminPermissionKey)) }
        : {}),
      active: record.active,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private async ensureMemoryAdmin() {
    if (!this.memoryAdminReady) {
      this.memoryAdminReady = (async () => {
        if (
          process.env.NODE_ENV === 'production' &&
          (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
        ) {
          throw new Error(
            'ADMIN_EMAIL and ADMIN_PASSWORD are required in production fallback mode',
          );
        }
        const email = (
          process.env.ADMIN_EMAIL ?? 'admin@sirohipoint.local'
        ).toLowerCase();
        const password = process.env.ADMIN_PASSWORD ?? 'LocalAdminOnly!2026';
        const existing = [...this.memoryUsers.values()].some(
          (user) => user.email === email,
        );
        if (existing) return;
        const user: MemoryUser = {
          id: '00000000-0000-4000-8000-000000000099',
          name: 'Sirohi Point Admin',
          email,
          phone: null,
          role: 'SUPER_ADMIN',
          active: true,
          createdAt: new Date().toISOString(),
          passwordHash: await hashPassword(password),
        };
        this.memoryUsers.set(user.id, user);
      })();
    }
    await this.memoryAdminReady;
  }
}
