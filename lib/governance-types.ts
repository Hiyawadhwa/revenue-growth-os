import type { Severity } from "./validation";

export type ExceptionStatus = "Open" | "Under Review" | "Resolved";

export interface ExceptionRow {
  id: number;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  rowNumber: number;
  record: string;
  message: string;
  status: ExceptionStatus;
  notes: string;
  detectedAt: string;
}

export interface AuditEntry {
  id: number;
  action: string;
  detail: string;
  createdAt: string;
}

export const excId = (id: number) => `EXC-${String(id).padStart(4, "0")}`;
