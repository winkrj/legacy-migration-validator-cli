import { readFileSync } from "node:fs";

export function readMarkdownFile(path: string): string {
  return readFileSync(path, "utf8");
}
