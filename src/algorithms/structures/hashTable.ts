import type { StructureAlgorithmFrame, StructureSnapshot } from '@/types';

const DEFAULT_BUCKET_COUNT = 7;

const createSnapshot = (buckets: readonly (readonly number[])[], label = 'Хеш-таблица: метод цепочек'): StructureSnapshot => ({
  label,
  cells: buckets.map((bucket, index) => ({ id: `bucket-${index}`, value: bucket[0] ?? null })),
  buckets: buckets.map((bucket, index) => ({ id: `bucket-${index}`, index, values: [...bucket] })),
});

const createFrame = (
  step: number,
  phase: StructureAlgorithmFrame['phase'],
  buckets: readonly (readonly number[])[],
  message: string,
  pseudocodeLine: number,
  bucketIndex?: number,
  key?: number,
  label?: string,
): StructureAlgorithmFrame => ({
  step,
  domain: 'array',
  phase,
  status: phase === 'complete' ? 'completed' : 'running',
  data: createSnapshot(buckets, label),
  activeIds: bucketIndex === undefined ? [] : [`bucket-${bucketIndex}`],
  pseudocode: { line: pseudocodeLine },
  message,
  description: message,
  meta: {
    operation: 'index',
    ...(bucketIndex === undefined ? {} : { activeIndex: bucketIndex, bucketIndex }),
    ...(key === undefined ? {} : { key }),
  },
});

export function* hashChainingScenario(
  values: readonly number[],
  bucketCount = DEFAULT_BUCKET_COUNT,
): Generator<StructureAlgorithmFrame, void, unknown> {
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  let step = 0;

  yield createFrame(
    step++,
    'initial',
    buckets,
    `Создаём хеш-таблицу из ${bucketCount} корзин. Индекс корзины вычисляется как остаток от деления: h(key) = key mod ${bucketCount}.`,
    1,
  );

  for (const value of values) {
    const bucketIndex = positiveModulo(value, bucketCount);
    yield createFrame(
      step++,
      'inspect',
      buckets,
      `Для ключа ${value} вычисляем индекс: ${value} mod ${bucketCount} = ${bucketIndex}. Поэтому работаем только с корзиной ${bucketIndex}, а не просматриваем всю таблицу.`,
      2,
      bucketIndex,
      value,
    );

    if (buckets[bucketIndex]!.length > 0) {
      yield createFrame(
        step++,
        'compare',
        buckets,
        `В корзине ${bucketIndex} уже есть значения [${buckets[bucketIndex]!.join(', ')}]. Это коллизия: разные ключи получили один индекс. Метод цепочек сохраняет их в списке корзины.`,
        3,
        bucketIndex,
        value,
      );
    }

    buckets[bucketIndex]!.push(value);
    yield createFrame(
      step++,
      'push',
      buckets,
      `Вставляем ${value} в цепочку корзины ${bucketIndex}. Поиск этого ключа позже начнётся сразу с этой корзины и проверит только элементы её цепочки.`,
      4,
      bucketIndex,
      value,
    );
  }

  yield createFrame(
    step,
    'complete',
    buckets,
    'Построение хеш-таблицы завершено. Среднее время вставки и поиска близко к O(1), если хеш-функция равномерно распределяет ключи и цепочки остаются короткими.',
    5,
  );
}

const positiveModulo = (value: number, modulus: number): number => ((value % modulus) + modulus) % modulus;

export function* hashOpenAddressingScenario(
  values: readonly number[],
  tableSize = DEFAULT_BUCKET_COUNT,
): Generator<StructureAlgorithmFrame, void, unknown> {
  const table: Array<number | null> = Array.from({ length: tableSize }, () => null);
  const label = 'Хеш-таблица: открытая адресация';
  let step = 0;

  yield createFrame(
    step++,
    'initial',
    table.map((value) => (value === null ? [] : [value])),
    `Создаём хеш-таблицу открытой адресации из ${tableSize} ячеек. В этой схеме все ключи хранятся прямо в массиве, а коллизии решаются поиском следующей свободной ячейки.`,
    1,
    undefined,
    undefined,
    label,
  );

  for (const value of values) {
    const startIndex = positiveModulo(value, tableSize);
    yield createFrame(
      step++,
      'inspect',
      table.map((cell) => (cell === null ? [] : [cell])),
      `Для ключа ${value} вычисляем начальную позицию: ${value} mod ${tableSize} = ${startIndex}.`,
      2,
      startIndex,
      value,
      label,
    );

    let placed = false;
    for (let probe = 0; probe < tableSize; probe += 1) {
      const index = (startIndex + probe) % tableSize;
      yield createFrame(
        step++,
        'compare',
        table.map((cell) => (cell === null ? [] : [cell])),
        probe === 0
          ? `Проверяем ячейку ${index}. Если она свободна, ключ можно записать без пробирования.`
          : `Линейное пробирование: проверяем следующую позицию ${index}, потому что предыдущая была занята.`,
        3,
        index,
        value,
        label,
      );

      if (table[index] === null) {
        table[index] = value;
        placed = true;
        yield createFrame(
          step++,
          'push',
          table.map((cell) => (cell === null ? [] : [cell])),
          `Ячейка ${index} свободна: вставляем ${value}. При поиске этого ключа алгоритм повторит тот же путь пробирования от позиции ${startIndex}.`,
          5,
          index,
          value,
          label,
        );
        break;
      }

      yield createFrame(
        step++,
        'inspect',
        table.map((cell) => (cell === null ? [] : [cell])),
        `Ячейка ${index} занята значением ${table[index]}. Это коллизия, поэтому переходим к следующей ячейке по правилу линейного пробирования.`,
        4,
        index,
        value,
        label,
      );
    }

    if (!placed) {
      yield createFrame(
        step++,
        'complete',
        table.map((cell) => (cell === null ? [] : [cell])),
        `Не удалось вставить ${value}: таблица заполнена. В открытой адресации важно контролировать коэффициент заполнения и расширять таблицу заранее.`,
        6,
        undefined,
        undefined,
        label,
      );
      return;
    }
  }

  yield createFrame(
    step,
    'complete',
    table.map((cell) => (cell === null ? [] : [cell])),
    'Построение хеш-таблицы открытой адресации завершено. Поиск использует ту же последовательность проб, что и вставка.',
    6,
    undefined,
    undefined,
    label,
  );
}


export function* hashBlockAddressingScenario(
  values: readonly number[],
  blockCount = 5,
  blockSize = 2,
): Generator<StructureAlgorithmFrame, void, unknown> {
  const label = 'Хеш-таблица: блочная адресация';
  const blocks: number[][] = Array.from({ length: blockCount }, () => []);
  let step = 0;

  yield createFrame(
    step++,
    'initial',
    blocks,
    `Создаём ${blockCount} основных блоков по ${blockSize} ячейки. Ключ сначала попадает в основной блок по формуле h(key) = key mod ${blockCount}.`,
    1,
    undefined,
    undefined,
    label,
  );

  for (const value of values) {
    const primaryBlock = positiveModulo(value, blockCount);
    yield createFrame(
      step++,
      'inspect',
      blocks,
      `Для ключа ${value} вычисляем основной блок: ${value} mod ${blockCount} = ${primaryBlock}.`,
      2,
      primaryBlock,
      value,
      label,
    );

    if (blocks[primaryBlock]!.length < blockSize) {
      blocks[primaryBlock]!.push(value);
      yield createFrame(
        step++,
        'push',
        blocks,
        `В основном блоке ${primaryBlock} есть свободная ячейка: помещаем ${value} внутрь этого блока.`,
        3,
        primaryBlock,
        value,
        label,
      );
      continue;
    }

    yield createFrame(
      step++,
      'compare',
      blocks,
      `Блок ${primaryBlock} заполнен значениями [${blocks[primaryBlock]!.join(', ')}]. Это переполнение блока, поэтому нужен дополнительный overflow-блок.`,
      4,
      primaryBlock,
      value,
      label,
    );

    const overflowIndex = blocks.length;
    blocks.push([value]);
    yield createFrame(
      step++,
      'push',
      blocks,
      `Создаём overflow-блок ${overflowIndex} и связываем его с основным блоком ${primaryBlock}. В него записываем ${value}.`,
      5,
      overflowIndex,
      value,
      label,
    );
  }

  yield createFrame(
    step,
    'complete',
    blocks,
    'Построение блочной хеш-таблицы завершено. Основные блоки дают быстрый доступ, а overflow-блоки показывают, где появились переполнения.',
    6,
    undefined,
    undefined,
    label,
  );
}
