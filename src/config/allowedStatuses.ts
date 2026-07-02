export const statusFieldNames = [
  "Status",
  "Decision",
  "Implementation",
  "Automation",
  "MCP/Plugin",
  "Implementation Permission",
] as const;

export const allowedStatuses: readonly string[] = [
  "Not Started",
  "Planning",
  "Preparation",
  "In Progress",
  "Ready for Review",
  "Ready for Archive",
  "Ready to Start",
  "Approved",
  "Rejected",
  "Archive with Conditions",
  "Archived",
  "Deferred",
  "Accepted",
  "Not Granted",
  "Granted for Phase 12 Only",
  "Completed",
  "Completed / Passed",
];
