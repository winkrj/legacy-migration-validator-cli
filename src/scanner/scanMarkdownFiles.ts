import { realpathSync } from "node:fs";
import { basename, relative, sep } from "node:path";
import { readMarkdownFile } from "./readMarkdownFile.js";
import { scanPaths } from "./scanPaths.js";

export interface ScannedMarkdownFile {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  content: string;
}

export function scanMarkdownFiles(root: string): ScannedMarkdownFile[] {
  const absoluteRoot = realpathSync(root);

  return scanPaths(absoluteRoot).map((absolutePath) => ({
    absolutePath,
    relativePath: relative(absoluteRoot, absolutePath)
      .split(sep)
      .join("/"),
    fileName: basename(absolutePath),
    content: readMarkdownFile(absolutePath),
  }));
}
