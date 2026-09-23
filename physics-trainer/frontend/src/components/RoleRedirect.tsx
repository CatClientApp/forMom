import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import type { User } from '../types';
import { useQuery } from '@tanstack/react-query';

/**
 * Кидает учителя на /teacher/*, ученика — на /student/*.
 * Используется на корневом маршруте "/".
 */
export default function RoleRedirect() {
  const navigate = useNavigate();
  const currentUserId = useUserStore(s => s.currentUserId);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // список доступен без X-User-Id
      const res = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:8000')}/api/users`);
      return (await res.json()) as User[];
    },
  });

  useEffect(() => {
    if (!users) return;
    const me = users.find(u => u.id === currentUserId);
    navigate(me?.role === 'teacher' ? '/teacher' : '/student', { replace: true });
  }, [users, currentUserId, navigate]);

  return null;
}
