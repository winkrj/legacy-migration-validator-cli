import {
  createValidationResult,
  type ValidationResult,
} from "../model/ValidationResult.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";
import { checkAcCoverage } from "./checkAcCoverage.js";
import { checkApiDetailSections } from "./checkApiDetailSections.js";
import { checkApiSpecTable } from "./checkApiSpecTable.js";
import { checkCanonicalTerms } from "./checkCanonicalTerms.js";
import { checkEvidenceCitation } from "./checkEvidenceCitation.js";
import { checkExternalRouteMatrix } from "./checkExternalRouteMatrix.js";
import { checkImplementationBoundary } from "./checkImplementationBoundary.js";
import { checkPermissionGate } from "./checkPermissionGate.js";
import { checkRequiredDocuments } from "./checkRequiredDocuments.js";
import { checkRequiredFields } from "./checkRequiredFields.js";
import { checkRequiredSections } from "./checkRequiredSections.js";
import { checkSensitivePatterns } from "./checkSensitivePatterns.js";
import { checkStatusVocabulary } from "./checkStatusVocabulary.js";
import { checkTaskTraceability } from "./checkTaskTraceability.js";

export function runRules(
  files: readonly ScannedMarkdownFile[],
): ValidationResult {
  return createValidationResult([
    ...checkRequiredDocuments(files),
    ...checkRequiredSections(files),
    ...checkRequiredFields(files),
    ...checkStatusVocabulary(files),
    ...checkImplementationBoundary(files),
    ...checkApiSpecTable(files),
    ...checkApiDetailSections(files),
    ...checkEvidenceCitation(files),
    ...checkExternalRouteMatrix(files),
    ...checkTaskTraceability(files),
    ...checkAcCoverage(files),
    ...checkPermissionGate(files),
    ...checkSensitivePatterns(files),
    ...checkCanonicalTerms(files),
  ]);
}
