import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const status = error.code === 'P2025' ? 404 : error.code === 'P2002' || error.code === 'P2034' ? 409 : ['P2023', 'P2003'].includes(error.code) ? 400 : 500;
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'details';
    const message = error.code === 'P2002' ? `An account or record with this ${target} already exists.` : error.code === 'P2034' ? 'The record changed during this request. Refresh and try again.' : status === 404 ? 'Record not found.' : status === 400 ? 'Invalid reference. Please select an existing record.' : 'Unable to complete the database request.';
    host.switchToHttp().getResponse<Response>().status(status).json({ statusCode: status, message });
  }
}
