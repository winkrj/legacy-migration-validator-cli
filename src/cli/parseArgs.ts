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
  "Usage: legacy-validator validate --root <path> --report <path>";

export class CliUsageError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export interface CliArguments {
  command: "validate";
  root: string;
  report: string;
}

export interface ValidatedCliArguments extends CliArguments {
  root: string;
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

  const values = new Map<string, string>();

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === undefined || !supportedOptions.has(option)) {
      throw new CliUsageError(`Unknown option: ${option ?? ""}`);
    }
    if (values.has(option)) {
      throw new CliUsageError(`Duplicate option: ${option}`);
    }

    const value = options[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new CliUsageError(`Missing value after ${option}.`);
    }

    values.set(option, value);
    index += 1;
  }

  const root = values.get("--root");
  const report = values.get("--report");
  if (root === undefined) {
    throw new CliUsageError("Missing required option: --root.");
  }
  if (report === undefined) {
    throw new CliUsageError("Missing required option: --report.");
  }

  return { command, root, report };
}

export function validatePaths(args: CliArguments): ValidatedCliArguments {
  const requestedRoot = resolve(args.root);
  if (!existsSync(requestedRoot)) {
    throw new CliUsageError(`Root path does not exist: ${requestedRoot}`);
  }
  if (!statSync(requestedRoot).isDirectory()) {
    throw new CliUsageError(`Root path is not a directory: ${requestedRoot}`);
  }

  const root = realpathSync(requestedRoot);
  const report = resolveProspectivePath(args.report);
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

  return { ...args, root, report };
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
