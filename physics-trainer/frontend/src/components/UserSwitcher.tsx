import { useEffect, useState } from 'react';
import { useUserStore } from '../store/userStore';
import { getUsers } from '../api/endpoints';

interface User {
  id: number;
  name: string;
  role: 'teacher' | 'student';
  color: string;
}

export default function UserSwitcher() {
  const { currentUserId, setCurrentUserId } = useUserStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Используем текущий ID если есть, иначе первый попавшийся
        const data = await getUsers(currentUserId || 1);
        setUsers(data);
        // Если текущий пользователь не выбран, выбираем первого
        if (!currentUserId && data.length > 0) {
          setCurrentUserId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  const currentUser = users.find(u => u.id === currentUserId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
          style={{ backgroundColor: currentUser?.color || '#6B7280' }}
        >
          {currentUser?.name.charAt(0) || '?'}
        </div>
        <span className="text-sm font-medium text-gray-700">
          {currentUser?.name || 'Гость'}
        </span>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20 overflow-hidden">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => {
                  setCurrentUserId(user.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 ${
                  currentUserId === user.id ? 'bg-indigo-50' : ''
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">
                    {user.role === 'teacher' ? '👩‍🏫 Учитель' : '📚 Ученик'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
