// 문서 안의 파이프(|) 마크다운 표를 파싱하는 공용 유틸.
export interface MarkdownTableRow {
  cells: string[];
  line: number;
}

export interface MarkdownTable {
  headerCells: string[];
  headerLine: number;
  dataRows: MarkdownTableRow[];
}

function splitCells(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) {
    text = text.slice(1);
  }
  if (text.endsWith("|")) {
    text = text.slice(0, -1);
  }
  return text.split("|").map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  return splitCells(line).every((cell) => /^:?-{1,}:?$/u.test(cell));
}

// 연속된 파이프 줄을 표 단위로 묶는다. header + separator + data 형태만 유효 표로 본다.
export function parseMarkdownTables(content: string): MarkdownTable[] {
  const lines = content.split(/\r?\n/u);
  const tables: MarkdownTable[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim().startsWith("|")) {
      index += 1;
      continue;
    }

    const start = index;
    const block: string[] = [];
    while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
      block.push(lines[index] ?? "");
      index += 1;
    }

    if (block.length >= 2 && isSeparatorRow(block[1] ?? "")) {
      const dataRows: MarkdownTableRow[] = [];
      for (let offset = 2; offset < block.length; offset += 1) {
        dataRows.push({
          cells: splitCells(block[offset] ?? ""),
          line: start + offset + 1,
        });
      }
      tables.push({
        headerCells: splitCells(block[0] ?? ""),
        headerLine: start + 1,
        dataRows,
      });
    }
  }

  return tables;
}

export function findColumnIndex(
  headerCells: readonly string[],
  matcher: RegExp,
): number {
  return headerCells.findIndex((cell) => matcher.test(cell));
}
