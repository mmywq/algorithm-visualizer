export interface QuizQuestion {
  readonly q: string;
  readonly options: readonly string[];
  /** индекс верного варианта в options */
  readonly answer: number;
  readonly explain: string;
  /** моноширинный фрагмент к вопросу: массив, код, таблица */
  readonly code?: string;
}
