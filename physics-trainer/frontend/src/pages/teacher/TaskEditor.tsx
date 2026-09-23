import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { articlesApi, tasksApi, topicsApi, uploadsApi } from '../../api/endpoints';
import Markdown from '../../components/Markdown';
import type { Task } from '../../types';

interface OptionDraft { text: string; is_correct: boolean }
interface HintDraft { tier: number; cost: number; content: string }
interface ImageDraft { url: string; order_index: number; id?: number }

const emptyForm = {
  topic_id: '' as '' | number,
  title: '',
  text: '',
  difficulty: 'easy' as 'easy' | 'medium' | 'hard',
  points: 1,
  answer_type: 'choice' as 'choice' | 'numeric' | 'text',
  correct_text: '',
  correct_number: '',
  tolerance: '',
  unit: '',
  explanation: '',
};

export default function TaskEditor() {
  const { id } = useParams();
  const taskId = id ? Number(id) : null;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(emptyForm);
  const [options, setOptions] = useState<OptionDraft[]>([
    { text: '', is_correct: true }, { text: '', is_correct: false }, { text: '', is_correct: false }, { text: '', is_correct: false },
  ]);
  const [hints, setHints] = useState<HintDraft[]>([]);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [articleIds, setArticleIds] = useState<number[]>([]);
  const [error, setError] = useState('');

  const { data: topics } = useQuery({ queryKey: ['topics'], queryFn: async () => (await topicsApi.getAll()).data });
  const { data: articles } = useQuery({ queryKey: ['articles'], queryFn: async () => (await articlesApi.getAll()).data });
  const { data: existing } = useQuery({
    queryKey: ['task', taskId],
    enabled: !!taskId,
    queryFn: async () => (await tasksApi.getById(taskId!)).data as Task & { article_ids?: number[] },
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      topic_id: existing.topic_id,
      title: existing.title,
      text: existing.text ?? '',
      difficulty: existing.difficulty,
      points: existing.points,
      answer_type: existing.answer_type,
      correct_text: existing.correct_text ?? '',
      correct_number: existing.correct_number != null ? String(existing.correct_number) : '',
      tolerance: existing.tolerance != null ? String(existing.tolerance) : '',
      unit: existing.unit ?? '',
      explanation: existing.explanation ?? '',
    });
    setOptions(existing.options.map((o) => ({ text: o.text, is_correct: o.is_correct })));
    setImages(existing.images.map((i) => ({ url: i.url, order_index: i.order_index, id: i.id })));
    setArticleIds(existing.article_ids ?? []);
    setHints(
      ((existing as any).hints ?? []).map((h: any) => ({ tier: h.tier, cost: h.cost, content: h.content }))
    );
  }, [existing]);

  const flatTopics = useMemo(() => {
    const list: { id: number; label: string }[] = [];
    (topics ?? []).forEach((t: any) => {
      list.push({ id: t.id, label: t.name });
      (t.children ?? []).forEach((c: any) => list.push({ id: c.id, label: `— ${c.name}` }));
    });
    return list;
  }, [topics]);

  const topicArticles = useMemo(
    () => (articles ?? []).filter((a: any) => form.topic_id === '' || a.topic_id === form.topic_id),
    [articles, form.topic_id]
  );

  const save = useMutation({
    mutationFn: async (payload: any) => {
      if (taskId) {
        await tasksApi.update(taskId, payload);
        return taskId;
      }
      const { data } = await tasksApi.create(payload);
      return data.id as number;
    },
    onSuccess: async (newId) => {
      // синхронизируем картинки и подсказки для новой задачи
      if (!taskId) {
        for (let i = 0; i < images.length; i++) {
          await tasksApi.addImage(newId, images[i].url, i);
        }
        for (const h of hints.filter((h) => h.content.trim())) {
          await tasksApi.createHint(newId, h);
        }
      }
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', newId] });
      navigate('/teacher/tasks');
    },
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Не удалось сохранить задачу'),
  });

  function validate(): string | null {
    if (form.topic_id === '') return 'Выберите тему';
    if (!form.title.trim()) return 'Укажите название';
    if (form.answer_type === 'choice') {
      const filled = options.filter((o) => o.text.trim());
      if (filled.length !== 4) return 'Должно быть ровно 4 варианта ответа';
      if (filled.filter((o) => o.is_correct).length !== 1) return 'Ровно один вариант должен быть верным';
    }
    if (form.answer_type === 'numeric' && form.correct_number.trim() === '') return 'Укажите правильный ответ (число)';
    if (form.answer_type === 'text' && !form.correct_text.trim()) return 'Укажите правильный текст ответа';
    return null;
  }

  function buildPayload() {
    return {
      topic_id: Number(form.topic_id),
      title: form.title.trim(),
      text: form.text || null,
      answer_type: form.answer_type,
      correct_text: form.answer_type === 'text' ? form.correct_text : null,
      correct_number: form.answer_type === 'numeric' ? Number(form.correct_number.replace(',', '.')) : null,
      tolerance: form.answer_type === 'numeric' && form.tolerance.trim() !== '' ? Number(form.tolerance.replace(',', '.')) : null,
      unit: form.unit || null,
      points: Number(form.points) || 1,
      difficulty: form.difficulty,
      explanation: form.explanation || null,
      options:
        form.answer_type === 'choice'
          ? options.map((o, i) => ({ text: o.text, is_correct: o.is_correct, order_index: i }))
          : [],
      article_ids: articleIds,
    };
  }

  async function onPickFiles(files: FileList | null) {
    if (!files) return;
    setError('');
    try {
      for (const f of Array.from(files)) {
        const { data } = await uploadsApi.uploadImage(f);
        setImages((prev) => [...prev, { url: data.url, order_index: prev.length }]);
      }
    } catch {
      setError('Не удалось загрузить картинку (jpg/png/webp, до 5 МБ)');
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">{taskId ? 'Редактирование задачи' : 'Новая задача'}</h2>
      {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>}

      <div className="space-y-4">
        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="label">Тема</span>
              <select className="input" value={form.topic_id} onChange={(e) => set({ topic_id: e.target.value === '' ? '' : Number(e.target.value) })}>
                <option value="">— выберите —</option>
                {flatTopics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Название (для списков)</span>
              <input className="input" value={form.title} onChange={(e) => set({ title: e.target.value })} />
            </label>
          </div>

          <div>
            <span className="label">Сложность</span>
            <div className="flex gap-4">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <label key={d} className="flex items-center gap-1 text-sm">
                  <input type="radio" name="difficulty" checked={form.difficulty === d} onChange={() => set({ difficulty: d })} />
                  {{ easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная' }[d]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="label">Баллы</span>
              <input type="number" min={1} className="input" value={form.points} onChange={(e) => set({ points: Number(e.target.value) })} />
            </label>
            <div>
              <span className="label">Тип ответа</span>
              <div className="flex gap-4 pt-1">
                {(['choice', 'numeric', 'text'] as const).map((a) => (
                  <label key={a} className="flex items-center gap-1 text-sm">
                    <input type="radio" name="answer_type" checked={form.answer_type === a} onChange={() => set({ answer_type: a })} />
                    {{ choice: '4 варианта', numeric: 'число', text: 'текст' }[a]}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className="label">Текст задачи (Markdown + LaTeX $…$)</span>
            <textarea className="input font-mono min-h-[120px]" value={form.text} onChange={(e) => set({ text: e.target.value })} />
            {form.text && (
              <div className="mt-2 p-3 border rounded bg-gray-50">
                <Markdown content={form.text} />
              </div>
            )}
          </div>
        </div>

        {/* Картинки */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="label mb-0">Картинки условия</span>
            <button type="button" className="btn-secondary text-sm flex items-center gap-1" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={14} /> Загрузить
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onPickFiles(e.target.files)} />
          </div>
          {images.length === 0 && <p className="text-sm text-gray-400">Нет картинок. Можно оставить пустым, если весь смысл в тексте.</p>}
          <div className="flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${img.url}`} alt="" className="h-24 rounded border object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Варианты ответа */}
        {form.answer_type === 'choice' && (
          <div className="card p-4">
            <span className="label">Варианты ответа — ровно 4, один верный</span>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct_option"
                    checked={o.is_correct}
                    onChange={() => setOptions((p) => p.map((x, idx) => ({ ...x, is_correct: idx === i })))}
                    title="Верный ответ"
                  />
                  <input
                    className="input flex-1"
                    placeholder={`Вариант ${i + 1}`}
                    value={o.text}
                    onChange={(e) => setOptions((p) => p.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {form.answer_type === 'numeric' && (
          <div className="card p-4 grid grid-cols-3 gap-4">
            <label className="block">
              <span className="label">Правильное число</span>
              <input className="input" value={form.correct_number} onChange={(e) => set({ correct_number: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Допуск (опц.)</span>
              <input className="input" value={form.tolerance} onChange={(e) => set({ tolerance: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Единицы</span>
              <input className="input" placeholder="Н, м/с²" value={form.unit} onChange={(e) => set({ unit: e.target.value })} />
            </label>
          </div>
        )}

        {form.answer_type === 'text' && (
          <div className="card p-4">
            <label className="block">
              <span className="label">Правильный текст (варианты через | )</span>
              <input className="input" value={form.correct_text} onChange={(e) => set({ correct_text: e.target.value })} />
            </label>
          </div>
        )}

        {/* Разбор */}
        <div className="card p-4">
          <span className="label">Разбор решения (показывается после ответа)</span>
          <textarea className="input font-mono min-h-[80px]" value={form.explanation} onChange={(e) => set({ explanation: e.target.value })} />
        </div>

        {/* Подсказки */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="label mb-0">Подсказки (tier 1=направление, 2=формула, 3=шаг)</span>
            <button type="button" className="btn-secondary text-sm flex items-center gap-1" onClick={() => setHints((p) => [...p, { tier: Math.min(3, p.length + 1), cost: 1, content: '' }])}>
              <Plus size={14} /> Подсказка
            </button>
          </div>
          {hints.map((h, i) => (
            <div key={i} className="flex gap-2 mb-2 items-start">
              <select className="input w-20" value={h.tier} onChange={(e) => setHints((p) => p.map((x, idx) => (idx === i ? { ...x, tier: Number(e.target.value) } : x)))}>
                {[1, 2, 3].map((t) => <option key={t} value={t}>T{t}</option>)}
              </select>
              <input type="number" min={0} className="input w-20" value={h.cost} onChange={(e) => setHints((p) => p.map((x, idx) => (idx === i ? { ...x, cost: Number(e.target.value) } : x)))} title="Стоимость в баллах" />
              <textarea className="input flex-1 min-h-[40px]" placeholder="Текст подсказки (Markdown + LaTeX)" value={h.content} onChange={(e) => setHints((p) => p.map((x, idx) => (idx === i ? { ...x, content: e.target.value } : x)))} />
              <button type="button" className="text-red-500 mt-2" onClick={() => setHints((p) => p.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>

        {/* Статьи */}
        <div className="card p-4">
          <span className="label">Привязанные статьи (кнопка 📖 при решении)</span>
          {topicArticles.length === 0 && <p className="text-sm text-gray-400">В этой теме пока нет статей.</p>}
          <div className="space-y-1">
            {topicArticles.map((a: any) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={articleIds.includes(a.id)}
                  onChange={(e) => setArticleIds((p) => (e.target.checked ? [...p, a.id] : p.filter((x) => x !== a.id)))}
                />
                {a.title}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 sticky bottom-0 bg-gray-50 py-3">
          <button className="btn-primary" disabled={save.isPending} onClick={() => { const v = validate(); if (v) return setError(v); setError(''); save.mutate(buildPayload()); }}>
            {save.isPending ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button className="btn-secondary" onClick={() => navigate('/teacher/tasks')}>Отмена</button>
        </div>
      </div>
    </div>
  );
}
