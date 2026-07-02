import {
  createValidationResult,
  type ValidationResult,
} from "../model/ValidationResult.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";
import { checkCanonicalTerms } from "./checkCanonicalTerms.js";
import { checkImplementationBoundary } from "./checkImplementationBoundary.js";
import { checkRequiredDocuments } from "./checkRequiredDocuments.js";
import { checkRequiredFields } from "./checkRequiredFields.js";
import { checkRequiredSections } from "./checkRequiredSections.js";
import { checkSensitivePatterns } from "./checkSensitivePatterns.js";
import { checkStatusVocabulary } from "./checkStatusVocabulary.js";

export function runRules(
  files: readonly ScannedMarkdownFile[],
): ValidationResult {
  return createValidationResult([
    ...checkRequiredDocuments(files),
    ...checkRequiredSections(files),
    ...checkRequiredFields(files),
    ...checkStatusVocabulary(files),
    ...checkImplementationBoundary(files),
    ...checkSensitivePatterns(files),
    ...checkCanonicalTerms(files),
  ]);
}
