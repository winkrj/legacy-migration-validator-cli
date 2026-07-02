export const requiredSections: Readonly<Record<string, readonly string[]>> =
  {
    "00_Index.md": ["Status", "Scope"],
    "01_Discover.md": [
      "Status",
      "Sources",
      "Findings",
      "Open Questions",
    ],
    "02_Specify.md": [
      "Status",
      "Domain Rules",
      "API Map",
      "DB Map",
      "Open Questions",
    ],
    "03_Plan.md": [
      "Status",
      "Implementation Plan",
      "Test Plan",
      "Risks",
    ],
    "04_Implement.md": [
      "Status",
      "Implementation Notes",
      "Changed Files",
    ],
    "05_Validate.md": [
      "Status",
      "Validation Results",
      "Compatibility Check",
    ],
    "06_Archive.md": [
      "Status",
      "Decision",
      "Archived Knowledge",
      "Carry-forward",
    ],
    "99_Open-Questions.md": ["Open Questions"],
  };
