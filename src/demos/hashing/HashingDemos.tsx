import { hashBlockScenario, hashClosedScenario, hashOpenScenario } from '@/algorithms/structures/extendedStructures';
import {
  hashBlockSearchScenario,
  hashChainingDeleteScenario,
  hashChainingSearchScenario,
  hashOpenAddressingSearchScenario,
} from '@/algorithms/structures/hashTable';
import hashingTheory from '@/content/theory/hashing';
import { KeyedStructureDemo } from '@/demos/shared/KeyedStructureDemo';
import { blockSearchPseudocode, chainingKeyPseudocode, openAddressingSearchPseudocode } from './pseudocode';

// набор подобран так, чтобы во всех трёх схемах возникали коллизии
const DEFAULT_KEYS = [12, 19, 31, 24, 8, 14];
const COLLISION_HINT = 'Набор по умолчанию подобран так, чтобы несколько ключей попадали в один адрес.';

const buildChaining = (values: readonly number[]) => hashOpenScenario(values);
const buildOpen = (values: readonly number[]) => hashClosedScenario(values);
const buildBlock = (values: readonly number[]) => hashBlockScenario(values);

export function ChainingDemo() {
  return (
    <KeyedStructureDemo
      actions={[
        {
          key: 'search',
          label: 'Поиск',
          needsKey: true,
          run: (values, target) => hashChainingSearchScenario(values, target, 7),
          pseudocode: chainingKeyPseudocode,
        },
        {
          key: 'delete',
          label: 'Удаление',
          needsKey: true,
          run: (values, target) => hashChainingDeleteScenario(values, target, 7),
          pseudocode: chainingKeyPseudocode,
        },
      ]}
      build={buildChaining}
      defaultTarget={24}
      defaultValues={DEFAULT_KEYS}
      keyHint={COLLISION_HINT}
      pseudocode={hashingTheory['hash-chaining']?.pseudocode ?? []}
    />
  );
}

export function OpenAddressingDemo() {
  return (
    <KeyedStructureDemo
      actions={[
        {
          key: 'search',
          label: 'Поиск',
          needsKey: true,
          run: (values, target) => hashOpenAddressingSearchScenario(values, target, 11),
          pseudocode: openAddressingSearchPseudocode,
        },
      ]}
      build={buildOpen}
      defaultTarget={24}
      defaultValues={DEFAULT_KEYS}
      input={{ maxSize: 11 }}
      keyHint="В таблице 11 ячеек — больше ключей она не вместит."
      pseudocode={hashingTheory['hash-open-addressing']?.pseudocode ?? []}
    />
  );
}

export function BlockAddressingDemo() {
  return (
    <KeyedStructureDemo
      actions={[
        {
          key: 'search',
          label: 'Поиск',
          needsKey: true,
          run: (values, target) => hashBlockSearchScenario(values, target, 5, 2),
          pseudocode: blockSearchPseudocode,
        },
      ]}
      build={buildBlock}
      defaultTarget={24}
      defaultValues={DEFAULT_KEYS}
      keyHint={COLLISION_HINT}
      pseudocode={hashingTheory['hash-block']?.pseudocode ?? []}
    />
  );
}
