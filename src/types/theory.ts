export interface PseudocodeLine {
  readonly code: string;
  readonly note?: string;
}

export interface TermDefinition {
  readonly term: string;
  readonly definition: string;
}

export interface ComplexityRow {
  readonly operation: string;
  readonly best?: string;
  readonly average: string;
  readonly worst: string;
}

export interface AlgorithmTheory {
  readonly intro: readonly string[];
  readonly purpose: readonly string[];
  readonly properties: readonly string[];
  readonly terms: readonly TermDefinition[];
  readonly complexity: readonly ComplexityRow[];
  readonly complexityNote?: string;
  readonly pseudocode: readonly PseudocodeLine[];
}
