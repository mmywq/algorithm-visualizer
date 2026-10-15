import type { ReactNode } from 'react';
import { StructureVisualizer, structureLegend } from '@/components/visualizers/structures/StructureVisualizer';
import type { PseudocodeLine, StructureAlgorithmFrame } from '@/types';
import type { NumbersInputOptions } from './ArrayAlgorithmDemo';
import { KeyedDemo, type KeyAction } from './KeyedDemo';

interface KeyedStructureDemoProps {
  readonly build: (values: readonly number[]) => Generator<StructureAlgorithmFrame, unknown, unknown>;
  readonly buildLabel?: string;
  readonly pseudocode: readonly PseudocodeLine[];
  readonly defaultValues: readonly number[];
  readonly actions?: readonly KeyAction<StructureAlgorithmFrame>[];
  readonly defaultTarget?: number;
  readonly keyHint?: string;
  readonly input?: NumbersInputOptions;
  readonly aside?: (frame: StructureAlgorithmFrame | null) => ReactNode;
}

const renderStage = (frame: StructureAlgorithmFrame | null) => <StructureVisualizer frame={frame} />;
const legend = (frames: readonly StructureAlgorithmFrame[]) => structureLegend(frames[0] ?? null);

export function KeyedStructureDemo(props: KeyedStructureDemoProps) {
  return <KeyedDemo<StructureAlgorithmFrame> {...props} legend={legend} renderStage={renderStage} />;
}
