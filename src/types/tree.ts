export type TreeTone = 'idle' | 'active' | 'path' | 'found' | 'done' | 'red' | 'black' | 'muted' | 'new';

export interface TreeDiagramNode {
  readonly key: string;
  readonly label: string;
  readonly parentKey: string | null;
  /** порядок среди братьев: для двоичных деревьев 0 — левый, 1 — правый */
  readonly side?: 0 | 1;
  readonly tone?: TreeTone;
  readonly badge?: string;
  readonly sublabel?: string;
  /** пульсирующее кольцо: выделяет узел, не меняя его заливку (нужно, когда цвет несёт смысл — красно-чёрное дерево) */
  readonly ring?: 'brand' | 'yellow' | 'green' | 'orange';
}
