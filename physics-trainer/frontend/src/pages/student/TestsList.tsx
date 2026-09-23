import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { testsApi } from '../../api/endpoints';
import type { Test } from '../../types';

export default function TestsList() {
  const { data: tests, isLoading } = useQuery({ queryKey: ['tests'], queryFn: async () => (await testsApi.getAll()).data });

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Тесты</h2>
      {isLoading && <p className="text-gray-500">Загрузка…</p>}
      {!isLoading && (tests?.length ?? 0) === 0 && (
        <p className="text-gray-500 bg-white rounded-lg border p-6 text-center">Учитель ещё не составил тесты.</p>
      )}
      <div className="space-y-3">
        {(tests ?? []).map((t: Test) => (
          <Link key={t.id} to={`/student/tests/${t.id}`} className="card p-4 flex items-center gap-4 hover:border-indigo-300">
            <ClipboardList className="text-indigo-500" size={28} />
            <div>
              <div className="font-semibold">{t.title}</div>
              {t.description && <div className="text-sm text-gray-500">{t.description}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
