import type { RuleId } from "./RuleId.js";

export type Severity = "error" | "warning";

export interface ValidationIssue {
  severity: Severity;
  ruleId: RuleId;
  message: string;
  file?: string;
  line?: number;
  details?: string;
}
