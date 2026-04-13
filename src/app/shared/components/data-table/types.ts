import { Type } from '@angular/core';

// ── Table Action ──
export interface TableAction {
  type: string;
  icon: string;
  label: string;
  show?: (row: any) => boolean;
  class?: string;
}

// ── Table Column ──
export interface TableColumn {
  key: string;
  label: string;
  cell?: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
  class?: string;
  actions?: TableAction[];
  icon?: string;
  colorKey?: string;
}

// ── Action Event ──
export interface TableActionEvent {
  type: string;
  row: any;
}

// ── Cell Inputs (shared contract for all cell components) ──
export interface CellInputs {
  value: unknown;
  row: any;
  column: TableColumn;
}

// ── Cell Registry Type ──
export type CellRegistry = Record<string, Type<unknown>>;

// ── Utility: resolve dot-path ──
export function resolve(obj: any | unknown, path: string): unknown {
  if (!path || !obj) return undefined;
  return path.split('.').reduce((o: any | undefined, k: string) => {
    if (o === undefined || o === null) return undefined;
    return (o as any)[k] as any | undefined;
  }, obj as any);
}
