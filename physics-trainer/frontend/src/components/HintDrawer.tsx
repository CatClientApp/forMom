import type { Hint } from '../types';

interface Props {
  hints: Hint[];
  openedIds: number[];
  onOpen: (hintId: number) => void;
}

/**
 * Тир-подсказки: 1 = направление, 2 = формула, 3 = шаг решения.
 * Открываются последовательно: нельзя открыть tier N, пока не открыт tier N-1.
 */
export default function HintDrawer({ hints, openedIds, onOpen }: Props) {
  const sorted = [...hints].sort((a, b) => a.tier - b.tier || a.cost - b.cost);
  const maxOpenedTier = openedIds.length === 0 ? 0 : Math.max(...sorted.filter((h) => openedIds.includes(h.id)).map((h) => h.tier), 0);
  const totalCost = sorted.filter((h) => openedIds.includes(h.id)).reduce((s, h) => s + h.cost, 0);

  if (sorted.length === 0) return <p className="text-sm text-gray-400">Для этой задачи подсказок нет.</p>;

  return (
    <div>
      <div className="text-xs text-gray-500 mb-3">
        Открыто: {openedIds.length} / {sorted.length} · потрачено баллов: <b>{totalCost}</b>
      </div>
      <div className="space-y-3">
        {sorted.map((h) => {
          const opened = openedIds.includes(h.id);
          const available = h.tier <= maxOpenedTier + 1;
          return (
            <div key={h.id} className={`border rounded-lg p-3 ${opened ? 'bg-amber-50 border-amber-300' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-500">
                  Подсказка {h.tier} ({['направление', 'формула', 'шаг решения'][h.tier - 1] ?? `уровень ${h.tier}`})
                </span>
                {!opened && <span className="text-xs text-red-500 font-medium">−{h.cost} балл(ов)</span>}
              </div>
              {opened ? (
                <div className="text-sm whitespace-pre-wrap">{h.content}</div>
              ) : available ? (
                <button className="btn-secondary text-sm w-full" onClick={() => onOpen(h.id)}>
                  Открыть (−{h.cost})
                </button>
              ) : (
                <p className="text-xs text-gray-400 italic">Сначала откройте предыдущую подсказку</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
