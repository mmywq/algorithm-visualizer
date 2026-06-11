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
  let collisions = 0;

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
      collisions += 1;
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

  const longestChain = buckets.reduce((best, bucket, index) => (bucket.length > best.length ? { length: bucket.length, index } : best), { length: 0, index: 0 });
  const usedBuckets = buckets.filter((bucket) => bucket.length > 0).length;
  yield createFrame(
    step,
    'complete',
    buckets,
    `Построение завершено: вставлено ${values.length} ключей в ${bucketCount} корзин, занято корзин: ${usedBuckets}, коллизий: ${collisions}. Самая длинная цепочка — ${longestChain.length} элем. в корзине ${longestChain.index}: столько сравнений потребует худший поиск. Среднее время операций близко к O(1), пока цепочки короткие.`,
    5,
  );
}

export function* hashChainingSearchScenario(
  values: readonly number[],
  target: number,
  bucketCount = DEFAULT_BUCKET_COUNT,
): Generator<StructureAlgorithmFrame, void, unknown> {
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  for (const value of values) {
    buckets[positiveModulo(value, bucketCount)]!.push(value);
  }
  let step = 0;

  yield createFrame(step++, 'initial', buckets, `Таблица построена по текущему набору значений. Ищем ключ ${target}.`, 1, undefined, target);

  const bucketIndex = positiveModulo(target, bucketCount);
  yield createFrame(step++, 'inspect', buckets, `Вычисляем индекс корзины: ${target} mod ${bucketCount} = ${bucketIndex}. Остальные ${bucketCount - 1} корзин при поиске не просматриваются.`, 2, bucketIndex, target);

  const chain = buckets[bucketIndex]!;
  if (chain.length === 0) {
    yield createFrame(step, 'complete', buckets, `Поиск завершён: корзина ${bucketIndex} пуста, значит ключа ${target} в таблице нет. Выполнено сравнений: 0 — пустая корзина даёт ответ сразу.`, 5, bucketIndex, target);
    return;
  }

  for (let position = 0; position < chain.length; position += 1) {
    const candidate = chain[position]!;
    yield createFrame(step++, 'compare', buckets, `Сравнение №${position + 1}: элемент цепочки ${candidate} ${candidate === target ? 'совпадает с искомым ключом' : `не равен ${target}, переходим к следующему элементу цепочки`}.`, 3, bucketIndex, target);
    if (candidate === target) {
      yield createFrame(step, 'complete', buckets, `Поиск завершён: ключ ${target} найден в корзине ${bucketIndex} на позиции ${position + 1} цепочки. Выполнено сравнений: ${position + 1}. Чем длиннее цепочка, тем дороже поиск — поэтому важна равномерная хеш-функция.`, 5, bucketIndex, target);
      return;
    }
  }

  yield createFrame(step, 'complete', buckets, `Поиск завершён: цепочка корзины ${bucketIndex} просмотрена целиком (${chain.length} сравнений), ключ ${target} не найден. В других корзинах его быть не может: хеш-функция всегда отправляет ${target} в корзину ${bucketIndex}.`, 5, bucketIndex, target);
}

export function* hashChainingDeleteScenario(
  values: readonly number[],
  target: number,
  bucketCount = DEFAULT_BUCKET_COUNT,
): Generator<StructureAlgorithmFrame, void, unknown> {
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  for (const value of values) {
    buckets[positiveModulo(value, bucketCount)]!.push(value);
  }
  let step = 0;

  yield createFrame(step++, 'initial', buckets, `Таблица построена по текущему набору значений. Удаляем ключ ${target}.`, 1, undefined, target);

  const bucketIndex = positiveModulo(target, bucketCount);
  yield createFrame(step++, 'inspect', buckets, `Вычисляем индекс корзины: ${target} mod ${bucketCount} = ${bucketIndex}. Удаление, как и поиск, работает только с этой корзиной.`, 2, bucketIndex, target);

  const chain = buckets[bucketIndex]!;
  const position = chain.indexOf(target);

  for (let i = 0; i < (position === -1 ? chain.length : position + 1); i += 1) {
    const candidate = chain[i]!;
    yield createFrame(step++, 'compare', buckets, `Сравнение №${i + 1}: элемент цепочки ${candidate} ${candidate === target ? 'совпадает с удаляемым ключом' : `не равен ${target}, идём дальше по цепочке`}.`, 3, bucketIndex, target);
  }

  if (position === -1) {
    yield createFrame(step, 'complete', buckets, `Удаление завершено без изменений: ключ ${target} не найден в корзине ${bucketIndex} (${chain.length} сравнений). Таблица осталась прежней.`, 5, bucketIndex, target);
    return;
  }

  chain.splice(position, 1);
  yield createFrame(step++, 'pop', buckets, `Исключаем ${target} из цепочки корзины ${bucketIndex}. Остальные элементы цепочки не перемещаются — меняется только ссылка списка.`, 4, bucketIndex, target);
  yield createFrame(step, 'complete', buckets, `Удаление завершено: ключ ${target} убран из корзины ${bucketIndex} за ${position + 1} сравн. Цепочка корзины теперь: [${chain.join(', ') || 'пусто'}]. В методе цепочек удаление не требует перестройки таблицы.`, 5, bucketIndex, target);
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

  let totalExtraProbes = 0;
  let worstProbes = { count: 0, key: values[0] ?? 0 };

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
        totalExtraProbes += probe;
        if (probe > worstProbes.count) {
          worstProbes = { count: probe, key: value };
        }
        yield createFrame(
          step++,
          'push',
          table.map((cell) => (cell === null ? [] : [cell])),
          probe === 0
            ? `Ячейка ${index} свободна: вставляем ${value} без пробирования — коллизии не было.`
            : `Ячейка ${index} свободна: вставляем ${value}. Из-за коллизий потребовалось ${probe} дополнительных проб; поиск этого ключа повторит тот же путь от позиции ${startIndex}.`,
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

  const occupied = table.filter((cell) => cell !== null).length;
  yield createFrame(
    step,
    'complete',
    table.map((cell) => (cell === null ? [] : [cell])),
    `Построение завершено: вставлено ${occupied} ключей в таблицу из ${tableSize} ячеек (заполненность ${Math.round((occupied / tableSize) * 100)}%). Дополнительных проб из-за коллизий: ${totalExtraProbes}${worstProbes.count > 0 ? `, длиннее всего пробировался ключ ${worstProbes.key} — ${worstProbes.count} лишних шагов` : ''}. Поиск любого ключа повторяет его путь пробирования, поэтому чем выше заполненность, тем дороже операции.`,
    6,
    undefined,
    undefined,
    label,
  );
}

export function* hashOpenAddressingSearchScenario(
  values: readonly number[],
  target: number,
  tableSize = DEFAULT_BUCKET_COUNT,
): Generator<StructureAlgorithmFrame, void, unknown> {
  const label = 'Хеш-таблица: открытая адресация';
  const table: Array<number | null> = Array.from({ length: tableSize }, () => null);
  for (const value of values) {
    let index = positiveModulo(value, tableSize);
    for (let probe = 0; probe < tableSize; probe += 1) {
      const candidate = (index + probe) % tableSize;
      if (table[candidate] === null) {
        table[candidate] = value;
        break;
      }
    }
  }
  const view = () => table.map((cell) => (cell === null ? [] : [cell]));
  let step = 0;

  yield createFrame(step++, 'initial', view(), `Таблица построена по текущему набору значений. Ищем ключ ${target}: поиск повторяет тот же путь пробирования, что и вставка.`, 1, undefined, target, label);

  const startIndex = positiveModulo(target, tableSize);
  yield createFrame(step++, 'inspect', view(), `Вычисляем начальную позицию: ${target} mod ${tableSize} = ${startIndex}.`, 2, startIndex, target, label);

  for (let probe = 0; probe < tableSize; probe += 1) {
    const index = (startIndex + probe) % tableSize;
    const cell = table[index];

    if (cell === null) {
      yield createFrame(step++, 'compare', view(), `Проба №${probe + 1}: ячейка ${index} пуста. Если бы ключ ${target} был в таблице, он встретился бы раньше на этом пути — поиск останавливается.`, 3, index, target, label);
      yield createFrame(step, 'complete', view(), `Поиск завершён: ключ ${target} отсутствует. Выполнено проб: ${probe + 1}, останов на пустой ячейке ${index}. Пустая ячейка — надёжный признак отсутствия ключа при линейном пробировании без удалений.`, 6, index, target, label);
      return;
    }

    yield createFrame(step++, 'compare', view(), `Проба №${probe + 1}: в ячейке ${index} значение ${cell}${cell === target ? ' — совпадает с искомым ключом' : ` ≠ ${target}, переходим к следующей ячейке`}.`, 3, index, target, label);

    if (cell === target) {
      yield createFrame(step, 'complete', view(), `Поиск завершён: ключ ${target} найден в ячейке ${index} за ${probe + 1} ${probe === 0 ? 'пробу' : 'проб'}. ${probe === 0 ? 'Ключ лежит в своей «домашней» ячейке — коллизий при его вставке не было.' : `Ключ смещён от домашней позиции ${startIndex} на ${probe} ячеек — это след коллизий при вставке.`}`, 6, index, target, label);
      return;
    }
  }

  yield createFrame(step, 'complete', view(), `Поиск завершён: пройдены все ${tableSize} ячеек, ключ ${target} не найден. Таблица заполнена целиком — худший случай открытой адресации.`, 6, undefined, target, label);
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

  const overflowOf: (number | null)[] = Array.from({ length: blockCount }, () => null);
  let overflowCount = 0;

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

    const chainIndex = findBlockWithSpace(blocks, overflowOf, primaryBlock, blockSize);
    if (chainIndex !== null) {
      blocks[chainIndex]!.push(value);
      yield createFrame(
        step++,
        'push',
        blocks,
        chainIndex === primaryBlock
          ? `В основном блоке ${primaryBlock} есть свободная ячейка: помещаем ${value} внутрь этого блока.`
          : `Основной блок ${primaryBlock} заполнен, но в его overflow-блоке ${chainIndex} есть место: помещаем ${value} туда.`,
        3,
        chainIndex,
        value,
        label,
      );
      continue;
    }

    yield createFrame(
      step++,
      'compare',
      blocks,
      `Блок ${primaryBlock} и его цепочка переполнения заполнены. Это переполнение блока, поэтому нужен новый overflow-блок.`,
      4,
      primaryBlock,
      value,
      label,
    );

    const overflowIndex = blocks.length;
    blocks.push([value]);
    overflowOf.push(primaryBlock);
    overflowCount += 1;
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
    `Построение завершено: ${values.length} ключей размещены в ${blockCount} основных блоках по ${blockSize} ячейки; переполнений: ${overflowCount}, создано overflow-блоков: ${overflowCount}. Поиск проверяет основной блок и цепочку его переполнений, не затрагивая чужие блоки.`,
    6,
    undefined,
    undefined,
    label,
  );
}

const findBlockWithSpace = (
  blocks: readonly (readonly number[])[],
  overflowOf: readonly (number | null)[],
  primaryBlock: number,
  blockSize: number,
): number | null => {
  if (blocks[primaryBlock]!.length < blockSize) return primaryBlock;
  for (let index = 0; index < blocks.length; index += 1) {
    if (overflowOf[index] === primaryBlock && blocks[index]!.length < blockSize) return index;
  }
  return null;
};

export function* hashBlockSearchScenario(
  values: readonly number[],
  target: number,
  blockCount = 5,
  blockSize = 2,
): Generator<StructureAlgorithmFrame, void, unknown> {
  const label = 'Хеш-таблица: блочная адресация';
  const blocks: number[][] = Array.from({ length: blockCount }, () => []);
  const overflowOf: (number | null)[] = Array.from({ length: blockCount }, () => null);
  for (const value of values) {
    const primaryBlock = positiveModulo(value, blockCount);
    const chainIndex = findBlockWithSpace(blocks, overflowOf, primaryBlock, blockSize);
    if (chainIndex !== null) {
      blocks[chainIndex]!.push(value);
    } else {
      blocks.push([value]);
      overflowOf.push(primaryBlock);
    }
  }
  let step = 0;

  yield createFrame(step++, 'initial', blocks, `Таблица построена по текущему набору значений. Ищем ключ ${target}: будет просмотрен основной блок и цепочка его переполнений.`, 1, undefined, target, label);

  const primaryBlock = positiveModulo(target, blockCount);
  yield createFrame(step++, 'inspect', blocks, `Вычисляем основной блок: ${target} mod ${blockCount} = ${primaryBlock}.`, 2, primaryBlock, target, label);

  const chainBlocks = [primaryBlock, ...blocks.map((_, index) => index).filter((index) => overflowOf[index] === primaryBlock)];
  let comparisons = 0;

  for (const blockIndex of chainBlocks) {
    const block = blocks[blockIndex]!;
    yield createFrame(step++, 'compare', blocks, `${blockIndex === primaryBlock ? `Просматриваем основной блок ${blockIndex}` : `Переходим к overflow-блоку ${blockIndex}`}: содержимое [${block.join(', ') || 'пусто'}].`, blockIndex === primaryBlock ? 3 : 4, blockIndex, target, label);

    for (const candidate of block) {
      comparisons += 1;
      if (candidate === target) {
        yield createFrame(step, 'complete', blocks, `Поиск завершён: ключ ${target} найден в ${blockIndex === primaryBlock ? `основном блоке ${blockIndex}` : `overflow-блоке ${blockIndex}`} за ${comparisons} сравн. Просмотрено блоков: ${chainBlocks.indexOf(blockIndex) + 1} из ${chainBlocks.length} в цепочке.`, 6, blockIndex, target, label);
        return;
      }
    }
  }

  yield createFrame(step, 'complete', blocks, `Поиск завершён: ключ ${target} не найден. Просмотрена вся цепочка блока ${primaryBlock} — ${chainBlocks.length} блок(ов), ${comparisons} сравнений. Чужие блоки не проверялись: хеш-функция однозначно определяет цепочку поиска.`, 6, primaryBlock, target, label);
}
