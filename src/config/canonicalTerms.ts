export interface CanonicalTerm {
  canonical: string;
  aliases: readonly string[];
}

export const canonicalTerms: readonly CanonicalTerm[] = [
  {
    canonical: "Archive with Conditions",
    aliases: ["Conditional Archive", "Conditionally Archived"],
  },
  {
    canonical: "Implementation Permission",
    aliases: ["Implement Permission", "Permission to Implement"],
  },
  {
    canonical: "Runtime Evidence",
    aliases: ["Runtime Proof", "Runtime Result"],
  },
  {
    canonical: "Human Policy Decision",
    aliases: ["Human Decision", "Policy Decision Only"],
  },
];
