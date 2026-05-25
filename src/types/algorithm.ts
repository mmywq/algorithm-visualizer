export type AlgorithmDomain = 'array' | 'graph' | 'tree';

export type AlgorithmPhase =
  | 'initial'
  | 'inspect'
  | 'compare'
  | 'swap'
  | 'visit'
  | 'enqueue'
  | 'dequeue'
  | 'push'
  | 'pop'
  | 'merge'
  | 'complete';

export type AlgorithmStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface PseudocodeLocation {
  readonly line: number;
  readonly label?: string;
}

export interface AlgorithmFrame<TData, TMeta extends Record<string, unknown> = Record<string, never>> {
  readonly step: number;
  readonly domain: AlgorithmDomain;
  readonly phase: AlgorithmPhase;
  readonly status: AlgorithmStatus;
  readonly data: TData;
  readonly activeIds: readonly string[];
  readonly pseudocode: PseudocodeLocation;
  readonly message: string;
  readonly meta: TMeta;
}

export type AlgorithmGenerator<
  TData,
  TMeta extends Record<string, unknown> = Record<string, never>,
> = Generator<AlgorithmFrame<TData, TMeta>, void, unknown>;

export type AlgorithmFactory<
  TInput,
  TData,
  TMeta extends Record<string, unknown> = Record<string, never>,
> = (input: TInput) => AlgorithmGenerator<TData, TMeta>;
