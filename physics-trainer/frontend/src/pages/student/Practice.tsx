import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BookOpen, HelpCircle, RotateCcw } from 'lucide-react';
import { articlesApi, attemptsApi, tasksApi, topicsApi } from '../../api/endpoints';
import Markdown from '../../components/Markdown';
import HintDrawer from '../../components/HintDrawer';
import type { Article, AttemptAnswerResult, Task } from '../../types';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface QueueItem { task: Task; attemptId: number }

export default function Practice({ initialTaskIds }: { initialTaskIds?: number[] }) {
  const [topicId, setTopicId] = useState<number | ''>('');
  const [difficulty, setDifficulty] = useState('');
  const [queue, setQueue] = useState<Task[]>([]);
  const [idx, setIdx] = useState(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [givenText, setGivenText] = useState('');
  const [result, setResult] = useState<AttemptAnswerResult | null>(null);
  const [openedHints, setOpenedHints] = useState<number[]>([]);
  const [drawer, setDrawer] = useState<'none' | 'hints' | 'articles'>('none');
  const [session, setSession] = useState({ solved: 0, points: 0 });

  const { data: topics } = useQuery({ queryKey: ['topics'], queryFn: async () => (await topicsApi.getAll()).data });
  const { data: articles } = useQuery({ queryKey: ['articles'], queryFn: async () => (await articlesApi.getAll()).data });

  const flatTopics = useMemo(() => {
    const list: { id: number; label: string }[] = [];
    (topics ?? []).forEach((t: any) => {
      list.push({ id: t.id, label: t.name });
      (t.children ?? []).forEach((c: any) => list.push({ id: c.id, label: `— ${c.name}` }));
    });
    return list;
  }, [topics]);

  const current = queue[idx] ?? null;
  const full = useQuery({
    queryKey: ['task', current?.id],
    enabled: !!current,
    queryFn: async () => (await tasksApi.getById(current!.id)).data as Task & { hints?: any[]; article_ids?: number[] },
  });
  const task = full.data ?? current;

  const taskArticles: Article[] = useMemo(() => {
    const ids = new Set((task as any)?.article_ids ?? []);
    return (articles ?? []).filter((a: Article) => ids.has(a.id));
  }, [articles, task]);

  async function start(taskIds?: number[]) {
    let list: Task[];
    if (taskIds) {
      list = [];
      for (const tid of taskIds) list.push((await tasksApi.getById(tid)).data as Task);
    } else {
      list = (await tasksApi.getAll({
        topic_id: topicId === '' ? undefined : Number(topicId),
        difficulty: difficulty || undefined,
        limit: 50,
      })).data as Task[];
    }
    // перемешаем для потока
    list = [...list].sort(() => Math.random() - 0.5);
    if (list.length === 0) return;
    setQueue(list);
    setIdx(0);
    resetCard();
  }

  function resetCard() {
    setSelected(null);
    setGivenText('');
    setResult(null);
    setOpenedHints([]);
    setAttemptId(null);
    setDrawer('none');
  }

  const answer = useMutation({
    mutationFn: async () => {
      if (!task) throw new Error('no task');
      let aid = attemptId;
      if (!aid) {
        const { data } = await attemptsApi.startPractice(task.id);
        aid = data.attempt_id;
        setAttemptId(aid);
      }
      const payload: any = { task_id: task.id, hints_used: openedHints };
      if (task.answer_type === 'choice') payload.chosen_option_id = selected;
      else payload.given_text = givenText;
      const { data } = await attemptsApi.answerPractice(aid!, payload);
      return data as AttemptAnswerResult;
    },
    onSuccess: (res) => {
      setResult(res);
      setSession((s) => ({ solved: s.solved + (res.is_correct ? 1 : 0), points: s.points + res.points_earned }));
    },
  });

  function next() {
    if (idx + 1 < queue.length) {
      setIdx(idx + 1);
      resetCard();
    } else {
      setQueue([]);
      setIdx(0);
      resetCard();
    }
  }

  // ===== выбор фильтров =====
  if (queue.length === 0) {
    return (
      <div className="max-w-xl">
        <h2 className="text-2xl font-bold mb-4">Свободная практика</h2>
        <div className="card p-6 space-y-4">
          <label className="block">
            <span className="label">Тема</span>
            <select className="input" value={topicId} onChange={(e) => setTopicId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Все темы</option>
              {flatTopics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Сложность</span>
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">Любая</option>
              <option value="easy">Лёгкие</option>
              <option value="medium">Средние</option>
              <option value="hard">Сложные</option>
            </select>
          </label>
          <button className="btn-primary w-full" onClick={() => start()}>Начать</button>
        </div>
      </div>
    );
  }

  // ===== поток задач =====
  return (
    <div className="max-w-3xl relative">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          Задача {idx + 1} из {queue.length} · решено за сессию: <b>{session.solved}</b> · набрано: <b>{session.points}</b> баллов
        </div>
        <div className="flex gap-2">
          <button className={`icon-btn ${drawer === 'hints' ? 'bg-indigo-100' : ''}`} title="Подсказки" onClick={() => setDrawer(drawer === 'hints' ? 'none' : 'hints')}>
            <HelpCircle size={20} />
          </button>
          {taskArticles.length > 0 && (
            <button className={`icon-btn ${drawer === 'articles' ? 'bg-indigo-100' : ''}`} title="Статьи" onClick={() => setDrawer(drawer === 'articles' ? 'none' : 'articles')}>
              <BookOpen size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg">{task?.title}</h3>
          <span className="badge bg-gray-100 text-gray-600">{task?.points} баллов</span>
        </div>

        {task?.text && <Markdown content={task.text} className="mb-4" />}

        {(task?.images ?? []).map((img) => (
          <img key={img.id} src={`${API}${img.url}`} alt="" className="rounded border mb-4 max-h-80 object-contain" />
        ))}

        {/* варианты */}
        {task?.answer_type === 'choice' && (
          <div className="space-y-2 mt-4">
            {(task.options ?? []).map((o) => {
              let cls = 'border rounded-lg px-4 py-3 cursor-pointer transition-colors';
              if (result) {
                if (o.id === result.correct_option_id) cls += ' border-green-500 bg-green-50';
                else if (o.id === selected) cls += ' border-red-500 bg-red-50';
                else cls += ' border-gray-200';
              } else if (o.id === selected) cls += ' border-indigo-500 bg-indigo-50';
              else cls += ' border-gray-200 hover:bg-gray-50';
              return (
                <div key={o.id} className={cls} onClick={() => !result && setSelected(o.id)}>
                  <Markdown content={o.text} inline />
                </div>
              );
            })}
          </div>
        )}

        {task?.answer_type === 'numeric' && !result && (
          <div className="mt-4 flex gap-2 items-center">
            <input className="input w-40" value={givenText} onChange={(e) => setGivenText(e.target.value)} placeholder="Ответ" />
            {task.unit && <span className="text-gray-500">{task.unit}</span>}
          </div>
        )}
        {task?.answer_type === 'text' && !result && (
          <input className="input mt-4" value={givenText} onChange={(e) => setGivenText(e.target.value)} placeholder="Ответ" />
        )}

        {/* результат */}
        {result && (
          <div className={`mt-4 p-4 rounded-lg border ${result.is_correct ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <div className="font-semibold">
              {result.is_correct ? `✅ Верно! +${result.points_earned} баллов` : '❌ Неверно'}
            </div>
            {result.explanation && (
              <div className="mt-2">
                <div className="text-sm font-medium text-gray-600 mb-1">Разбор:</div>
                <Markdown content={result.explanation} />
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {!result ? (
            <button
              className="btn-primary"
              disabled={answer.isPending || (task?.answer_type === 'choice' ? selected == null : !givenText.trim())}
              onClick={() => answer.mutate()}
            >
              {answer.isPending ? 'Проверка…' : 'Ответить'}
            </button>
          ) : (
            <>
              <button className="btn-primary flex items-center gap-2" onClick={next}>
                {idx + 1 < queue.length ? 'Следующая задача →' : 'В меню'}
              </button>
              <button className="btn-secondary flex items-center gap-2" onClick={() => { setResult(null); setSelected(null); setAttemptId(null); }}>
                <RotateCcw size={14} /> Повторить эту
              </button>
            </>
          )}
        </div>
      </div>

      {/* drawers */}
      {drawer !== 'none' && task && (
        <aside className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l z-40 overflow-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold">{drawer === 'hints' ? 'Подсказки' : 'Статьи по теме'}</h4>
            <button className="text-gray-400 hover:text-gray-700" onClick={() => setDrawer('none')}>✕</button>
          </div>
          {drawer === 'hints' ? (
            <HintDrawer
              hints={(task as any).hints ?? []}
              openedIds={openedHints}
              onOpen={(hintId) => setOpenedHints((p) => (p.includes(hintId) ? p : [...p, hintId]))}
            />
          ) : (
            <div className="space-y-4">
              {taskArticles.map((a) => (
                <div key={a.id} className="border rounded-lg p-3">
                  <div className="font-semibold mb-1">{a.title}</div>
                  <Markdown content={a.content_md} />
                </div>
              ))}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
