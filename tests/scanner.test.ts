import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scanMarkdownFiles } from "../src/scanner/scanMarkdownFiles.js";

const temporaryPaths: string[] = [];

afterEach(() => {
  for (const path of temporaryPaths.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

function temporaryDirectory(): string {
  const path = mkdtempSync(join(tmpdir(), "legacy-scanner-"));
  temporaryPaths.push(path);
  return path;
}

function writePublicFile(path: string, content = "Public-safe example"): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

describe("read-only Markdown scanner", () => {
  it("scans nested .md files and returns normalized metadata and content", () => {
    const root = temporaryDirectory();
    writePublicFile(join(root, "00_Index.md"), "# Example Index");
    writePublicFile(
      join(root, "feature", "01_Discover.md"),
      "# Example Discover",
    );

    const files = scanMarkdownFiles(root);

    expect(files.map((file) => file.relativePath)).toEqual([
      "00_Index.md",
      "feature/01_Discover.md",
    ]);
    expect(files[1]).toMatchObject({
      absolutePath: join(
        realpathSync(root),
        "feature",
        "01_Discover.md",
      ),
      relativePath: "feature/01_Discover.md",
      fileName: "01_Discover.md",
      content: "# Example Discover",
    });
  });

  it("ignores non-Markdown and uppercase .MD files", () => {
    const root = temporaryDirectory();
    writePublicFile(join(root, "included.md"));
    writePublicFile(join(root, "ignored.txt"));
    writePublicFile(join(root, "ignored.MD"));

    expect(
      scanMarkdownFiles(root).map((file) => file.relativePath),
    ).toEqual(["included.md"]);
  });

  it.each([
    ".git",
    "node_modules",
    "dist",
    "reports",
    ".obsidian",
    ".cache",
    ".hidden",
  ])("excludes the %s directory anywhere under root", (directory) => {
    const root = temporaryDirectory();
    writePublicFile(join(root, "nested", directory, "ignored.md"));
    writePublicFile(join(root, "visible.md"));

    expect(
      scanMarkdownFiles(root).map((file) => file.relativePath),
    ).toEqual(["visible.md"]);
  });

  it("does not follow a symlink file", () => {
    const root = temporaryDirectory();
    const outside = temporaryDirectory();
    const target = join(outside, "outside.md");
    writePublicFile(target, "Outside content");
    symlinkSync(target, join(root, "linked.md"));

    expect(scanMarkdownFiles(root)).toEqual([]);
  });

  it("does not follow a symlink directory", () => {
    const root = temporaryDirectory();
    const outside = temporaryDirectory();
    writePublicFile(join(outside, "outside.md"), "Outside content");
    symlinkSync(outside, join(root, "linked-directory"), "dir");

    expect(scanMarkdownFiles(root)).toEqual([]);
  });

  it("does not mutate scanned files", () => {
    const root = temporaryDirectory();
    const filePath = join(root, "example.md");
    const originalContent = "# Stable Example\n";
    writePublicFile(filePath, originalContent);
    const before = statSync(filePath);

    scanMarkdownFiles(root);

    const after = statSync(filePath);
    expect(readFileSync(filePath, "utf8")).toBe(originalContent);
    expect(after.size).toBe(before.size);
    expect(after.mtimeMs).toBe(before.mtimeMs);
    expect(lstatSync(filePath).isSymbolicLink()).toBe(false);
  });
});
