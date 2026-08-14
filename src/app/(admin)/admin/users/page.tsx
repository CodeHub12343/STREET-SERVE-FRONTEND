import type { Metadata } from 'next';
import { UserManagement } from '@/features/admin';

export const metadata: Metadata = { title: 'User management' };

export default function UsersPage() {
  return <UserManagement />;
}
