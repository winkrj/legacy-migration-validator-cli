import {
  existsSync,
  realpathSync,
  statSync,
} from "node:fs";
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

export const USAGE =
  "Usage: legacy-validator validate --root <path> [--root <path> ...] --report <path>";

export class CliUsageError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export interface CliArguments {
  command: "validate";
  roots: string[];
  report: string;
}

export interface ValidatedCliArguments extends CliArguments {
  roots: string[];
  report: string;
}

const supportedOptions = new Set(["--root", "--report"]);

export function parseArgs(args: readonly string[]): CliArguments {
  const [command, ...options] = args;

  if (command === undefined) {
    throw new CliUsageError("Missing command.");
  }
  if (command !== "validate") {
    throw new CliUsageError(`Unknown command: ${command}`);
  }

  const roots: string[] = [];
  let report: string | undefined;

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === undefined || !supportedOptions.has(option)) {
      throw new CliUsageError(`Unknown option: ${option ?? ""}`);
    }

    const value = options[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new CliUsageError(`Missing value after ${option}.`);
    }

    if (option === "--root") {
      roots.push(value);
    } else {
      if (report !== undefined) {
        throw new CliUsageError("Duplicate option: --report");
      }
      report = value;
    }
    index += 1;
  }

  if (roots.length === 0) {
    throw new CliUsageError("Missing required option: --root.");
  }
  if (report === undefined) {
    throw new CliUsageError("Missing required option: --report.");
  }

  return { command, roots, report };
}

export function validatePaths(args: CliArguments): ValidatedCliArguments {
  const roots = args.roots.map((requested) => {
    const requestedRoot = resolve(requested);
    if (!existsSync(requestedRoot)) {
      throw new CliUsageError(`Root path does not exist: ${requestedRoot}`);
    }
    if (!statSync(requestedRoot).isDirectory()) {
      throw new CliUsageError(
        `Root path is not a directory: ${requestedRoot}`,
      );
    }
    return realpathSync(requestedRoot);
  });

  const report = resolveProspectivePath(args.report);
  for (const root of roots) {
    const reportRelativeToRoot = relative(root, report);
    const reportIsInsideRoot =
      reportRelativeToRoot === "" ||
      (!reportRelativeToRoot.startsWith(`..${sep}`) &&
        reportRelativeToRoot !== ".." &&
        !isAbsolute(reportRelativeToRoot));

    if (reportIsInsideRoot) {
      throw new CliUsageError(
        "Report path must be outside the input root.",
      );
    }
  }

  return { ...args, roots, report };
}

function resolveProspectivePath(inputPath: string): string {
  const absolutePath = resolve(inputPath);
  let existingPath = absolutePath;
  const missingSegments: string[] = [];

  while (!existsSync(existingPath)) {
    const parent = dirname(existingPath);
    if (parent === existingPath) {
      return absolutePath;
    }
    missingSegments.unshift(existingPath.slice(parent.length + 1));
    existingPath = parent;
  }

  return join(realpathSync(existingPath), ...missingSegments);
}
