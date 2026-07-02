import { readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";

const excludedDirectoryNames = new Set([
  ".git",
  "node_modules",
  "dist",
  "reports",
]);

export function scanPaths(root: string): string[] {
  const absoluteRoot = realpathSync(root);
  const markdownPaths: string[] = [];
  visitDirectory(absoluteRoot, markdownPaths);
  return markdownPaths.sort((left, right) => left.localeCompare(right));
}

function visitDirectory(
  directory: string,
  markdownPaths: string[],
): void {
  const entries = readdirSync(directory, { withFileTypes: true }).sort(
    (left, right) => left.name.localeCompare(right.name),
  );

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (shouldExcludeDirectory(entry.name)) {
        continue;
      }
      visitDirectory(absolutePath, markdownPaths);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      markdownPaths.push(absolutePath);
    }
  }
}

function shouldExcludeDirectory(name: string): boolean {
  return name.startsWith(".") || excludedDirectoryNames.has(name);
}
