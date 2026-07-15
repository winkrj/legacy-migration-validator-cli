#!/usr/bin/env node

import { basename } from "node:path";
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
    const multipleRoots = validatedArguments.roots.length > 1;
    const markdownFiles = validatedArguments.roots.flatMap((root) => {
      const files = scanMarkdownFiles(root);
      // root가 여러 개면 어느 root의 파일인지 경로로 구분한다.
      return multipleRoots
        ? files.map((file) => ({
            ...file,
            relativePath: `${basename(root)}/${file.relativePath}`,
          }))
        : files;
    });
    const validationResult = runRules(markdownFiles);
    const report = buildMarkdownReport({
      root: validatedArguments.roots.join(", "),
      markdownFileCount: markdownFiles.length,
      validationResult,
    });
    writeReport(validatedArguments.report, report);
    io.stdout("Legacy Migration Validator CLI");
    for (const root of validatedArguments.roots) {
      io.stdout(`Root: ${root}`);
    }
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
