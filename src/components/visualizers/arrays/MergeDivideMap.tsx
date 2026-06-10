interface MergeDivideMapProps {
  readonly values: readonly number[];
}

interface DivideGroup {
  readonly values: readonly number[];
  readonly parentIndex: number;
}

const CELL_WIDTH = 38;
const CELL_HEIGHT = 28;
const GROUP_GAP = 14;
const LEVEL_GAP = 34;
const PADDING = 12;
const MAX_ELEMENTS = 8;

/**
 * Статичная схема «дерева деления» сортировки слиянием: показывает, как массив
 * раскладывается пополам до отдельных элементов ещё до запуска анимации.
 */
export function MergeDivideMap({ values }: MergeDivideMapProps) {
  const shown = values.slice(0, MAX_ELEMENTS);
  if (shown.length < 2) {
    return null;
  }

  const levels: DivideGroup[][] = [[{ values: shown, parentIndex: -1 }]];
  while (levels[levels.length - 1]!.some((group) => group.values.length > 1)) {
    const previous = levels[levels.length - 1]!;
    const next: DivideGroup[] = [];
    previous.forEach((group, parentIndex) => {
      if (group.values.length <= 1) {
        next.push({ values: group.values, parentIndex });
        return;
      }
      const middle = Math.ceil(group.values.length / 2);
      next.push({ values: group.values.slice(0, middle), parentIndex });
      next.push({ values: group.values.slice(middle), parentIndex });
    });
    levels.push(next);
  }

  const levelWidth = (level: readonly DivideGroup[]): number =>
    level.reduce((sum, group) => sum + group.values.length * CELL_WIDTH, 0) + (level.length - 1) * GROUP_GAP;
  const svgWidth = Math.max(...levels.map(levelWidth)) + PADDING * 2;
  const svgHeight = levels.length * CELL_HEIGHT + (levels.length - 1) * LEVEL_GAP + PADDING * 2;

  // координаты групп: по уровням, каждый уровень центрируется
  const positions: { x: number; y: number; width: number }[][] = levels.map((level, levelIndex) => {
    let cursor = (svgWidth - levelWidth(level)) / 2;
    return level.map((group) => {
      const width = group.values.length * CELL_WIDTH;
      const position = { x: cursor, y: PADDING + levelIndex * (CELL_HEIGHT + LEVEL_GAP), width };
      cursor += width + GROUP_GAP;
      return position;
    });
  });

  return (
    <section className="app-panel">
      <h2 className="text-xl font-semibold text-app-primary">Карта алгоритма: деление массива</h2>
      <p className="mt-2 text-sm leading-6 text-app-muted">
        Схема показывает, что произойдёт с данными до запуска анимации: массив делится пополам, пока в каждой части не останется один элемент.
        Затем те же части сливаются в обратном порядке — снизу вверх; именно слияние и демонстрируют шаги анимации.
        {values.length > MAX_ELEMENTS ? ` На схеме показаны первые ${MAX_ELEMENTS} элементов массива.` : ''}
      </p>
      <div className="mt-4 overflow-x-auto">
        <svg
          className="mx-auto block"
          height={svgHeight}
          role="img"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width={Math.min(svgWidth, 760)}
        >
          {levels.map((level, levelIndex) =>
            level.map((group, groupIndex) => {
              const position = positions[levelIndex]![groupIndex]!;
              const parentPosition = levelIndex > 0 ? positions[levelIndex - 1]![group.parentIndex] : undefined;
              return (
                <g key={`${levelIndex}-${groupIndex}`}>
                  {parentPosition !== undefined && (
                    <line
                      stroke="#64748b"
                      strokeWidth={1.5}
                      x1={parentPosition.x + parentPosition.width / 2}
                      x2={position.x + position.width / 2}
                      y1={parentPosition.y + CELL_HEIGHT}
                      y2={position.y}
                    />
                  )}
                  {group.values.map((value, cellIndex) => (
                    <g key={cellIndex}>
                      <rect
                        fill={group.values.length === 1 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(139, 92, 246, 0.12)'}
                        height={CELL_HEIGHT}
                        stroke={group.values.length === 1 ? '#34d399' : '#8b5cf6'}
                        strokeWidth={1}
                        width={CELL_WIDTH}
                        x={position.x + cellIndex * CELL_WIDTH}
                        y={position.y}
                      />
                      <text
                        dominantBaseline="central"
                        fill="#e2e8f0"
                        fontSize={12}
                        fontWeight={700}
                        textAnchor="middle"
                        x={position.x + cellIndex * CELL_WIDTH + CELL_WIDTH / 2}
                        y={position.y + CELL_HEIGHT / 2 + 1}
                      >
                        {value}
                      </text>
                    </g>
                  ))}
                </g>
              );
            }),
          )}
        </svg>
      </div>
    </section>
  );
}
