import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import apiClient from '../../api/client';
import Markdown from '../../components/Markdown';
import type { Task } from '../../types';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface TestTask extends Task {}
interface ReviewAnswer {
  task_id: number;
  is_correct: boolean;
  points_earned: number;
  chosen_option_id: number | null;
  given_text: string | null;
}

export default function TestRun() {
  const { id } = useParams();
  const testId = Number(id);
  const navigate = useNavigate();

  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<TestTask[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { chosen_option_id?: number; given_text?: string }>>({});
  const [review, setReview] = useState<{ score: number; max_score: number; answers: ReviewAnswer[] } | null>(null);

  // запуск теста
  const start = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/api/attempts/test/start`, { test_id: testId });
      return data as { attempt_id: number; tasks: any[] };
    },
    onSuccess: (data) => {
      setAttemptId(data.attempt_id);
      setTasks(data.tasks as TestTask[]);
      setIdx(0);
    },
  });

  const finish = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/api/attempts/test/${attemptId}/finish`);
      return data as { score: number; max_score: number };
    },
    onSuccess: async (res) => {
      let detail: any[] = [];
      try {
        const { data } = await apiClient.get(`/api/attempts/${attemptId}`);
        detail = data.answers ?? [];
      } catch { /* ignore */ }
      setReview({ score: res.score, max_score: res.max_score, answers: detail });
    },
  });

  // ===== разбор =====
  if (review) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="card p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Тест завершён!</h2>
          <div className="text-4xl font-bold text-indigo-600">{review.score} / {review.max_score}</div>
        </div>
        {tasks.map((t, i) => {
          const a = review.answers.find((x) => x.task_id === t.id);
          const correctOpt = t.options?.find((o) => o.is_correct);
          return (
            <div key={t.id} className={`card p-5 border-l-4 ${a?.is_correct ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <div className="font-semibold mb-1">{i + 1}. {t.title} — {a ? (a.is_correct ? `✅ +${a.points_earned}` : '❌ 0') : '— пропущено'}</div>
              {t.text && <Markdown content={t.text} />}
              {correctOpt && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-500">Правильный ответ:</span>{' '}
                  <Markdown content={correctOpt.text} inline />
                </div>
              )}
              {t.explanation && (
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <div className="text-xs font-medium text-gray-500 mb-1">Разбор</div>
                  <Markdown content={t.explanation} />
                </div>
              )}
            </div>
          );
        })}
        <button className="btn-primary" onClick={() => navigate('/student/tests')}>К списку тестов</button>
      </div>
    );
  }

  // ===== старт =====
  if (!attemptId) {
    return (
      <div className="max-w-xl">
        <h2 className="text-2xl font-bold mb-4">Прохождение теста</h2>
        <div className="card p-6">
          <p className="mb-4 text-gray-600">Ответы не показываются до завершения теста. Подсказки недоступны.</p>
          <button className="btn-primary w-full" disabled={start.isPending} onClick={() => start.mutate()}>
            {start.isPending ? 'Загрузка…' : 'Начать тест'}
          </button>
        </div>
      </div>
    );
  }

  const t = tasks[idx];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">Вопрос {idx + 1} из {tasks.length}</span>
        <div className="w-48 h-2 bg-gray-200 rounded overflow-hidden">
          <div className="h-full bg-indigo-500" style={{ width: `${((idx + 1) / tasks.length) * 100}%` }} />
        </div>
      </div>

      {t && (
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-2">{t.title}</h3>
          {t.text && <Markdown content={t.text} className="mb-4" />}
          {(t.images ?? []).map((img) => (
            <img key={img.id} src={`${API}${img.url}`} alt="" className="rounded border mb-4 max-h-80 object-contain" />
          ))}

          {t.answer_type === 'choice' ? (
            <div className="space-y-2 mt-4">
              {(t.options ?? []).map((o) => (
                <div
                  key={o.id}
                  className={`border rounded-lg px-4 py-3 cursor-pointer ${answers[t.id]?.chosen_option_id === o.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setAnswers((p) => ({ ...p, [t.id]: { chosen_option_id: o.id } }))}
                >
                  <Markdown content={o.text} inline />
                </div>
              ))}
            </div>
          ) : (
            <input
              className="input mt-4"
              placeholder={t.answer_type === 'numeric' ? `Ответ${t.unit ? `, ${t.unit}` : ''}` : 'Ответ'}
              value={answers[t.id]?.given_text ?? ''}
              onChange={(e) => setAnswers((p) => ({ ...p, [t.id]: { given_text: e.target.value } }))}
            />
          )}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button className="btn-secondary" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← Назад</button>
        {idx + 1 < tasks.length ? (
          <button className="btn-primary" onClick={() => setIdx(idx + 1)}>Вперёд →</button>
        ) : (
          <button className="btn-primary bg-green-600 hover:bg-green-700" disabled={finish.isPending} onClick={() => finish.mutate()}>
            {finish.isPending ? 'Подсчёт…' : 'Завершить тест'}
          </button>
        )}
      </div>
    </div>
  );
}
