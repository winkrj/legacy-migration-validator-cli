#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import {
  CliUsageError,
  parseArgs,
  USAGE,
  validatePaths,
} from "./cli/parseArgs.js";
import { buildMarkdownReport } from "./report/buildMarkdownReport.js";
import { writeReport } from "./report/writeReport.js";
import { scanMarkdownFiles } from "./scanner/scanMarkdownFiles.js";
import { runRules } from "./rules/runRules.js";

export const CLI_NAME = "legacy-validator";

export interface CliIo {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

const defaultIo: CliIo = {
  stdout: console.log,
  stderr: console.error,
};

export function runCli(
  args: readonly string[],
  io: CliIo = defaultIo,
): number {
  try {
    const validatedArguments = validatePaths(parseArgs(args));
    const markdownFiles = scanMarkdownFiles(validatedArguments.root);
    const validationResult = runRules(markdownFiles);
    const report = buildMarkdownReport({
      root: validatedArguments.root,
      markdownFileCount: markdownFiles.length,
      validationResult,
    });
    writeReport(validatedArguments.report, report);
    io.stdout("Legacy Migration Validator CLI");
    io.stdout(`Root: ${validatedArguments.root}`);
    io.stdout(`Markdown files scanned: ${markdownFiles.length}`);
    io.stdout(`Errors: ${validationResult.errorCount}`);
    io.stdout(`Warnings: ${validationResult.warningCount}`);
    io.stdout(`Report written: ${validatedArguments.report}`);
    return validationResult.hasErrors ? 1 : 0;
  } catch (error: unknown) {
    if (error instanceof CliUsageError) {
      io.stderr(`Error: ${error.message}`);
      io.stderr(USAGE);
      return error.exitCode;
    }

    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`Unexpected error: ${message}`);
    return 3;
  }
}

const invokedPath = process.argv[1];
if (
  invokedPath !== undefined &&
  fileURLToPath(import.meta.url) === invokedPath
) {
  process.exitCode = runCli(process.argv.slice(2));
}
