import { createContext } from 'react';
import type { AdminPermissionKey } from '@/shared/contracts';

export const AdminPermissionContext = createContext<(permission: AdminPermissionKey) => boolean>(() => false);
