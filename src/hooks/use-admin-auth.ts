import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
}

export function useAdminAuth() {
  const { user } = useAuth();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAdminUser(null);
      setLoading(false);
      return;
    }

    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/users');
        
        if (response.status === 403) {
          setAdminUser(null);
          setError('Admin access required');
        } else if (response.ok) {
          // If we can access admin users API, we're an admin
          setAdminUser({
            id: user.id,
            email: user.email || '',
            name: user.email || '',
            role: 'super_admin',
            is_active: true
          });
          setError(null);
        } else {
          setAdminUser(null);
          setError('Failed to check admin status');
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setAdminUser(null);
        setError('Failed to check admin status');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const isAdmin = adminUser !== null && adminUser.is_active;
  const isSuperAdmin = adminUser?.role === 'super_admin';

  return {
    adminUser,
    isAdmin,
    isSuperAdmin,
    loading,
    error
  };
}
