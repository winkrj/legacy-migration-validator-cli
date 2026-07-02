# Legacy Migration Validator CLI

Local CLI Validator PoC for read-only checks of Markdown-based migration documentation.

## Status

CLI v1 PoC implementation is complete and under acceptance review.

The PoC validates Markdown structure and approved surface-level
conventions. It does not judge domain meaning or prove runtime behavior.

## Command Contract

```text
legacy-validator validate --root <path> --report <path>
```

The report path must be outside the input root. A report path inside the input root is a usage error with exit code `2`.

## Exit Codes

- `0`: no validation errors
- `1`: validation errors
- `2`: CLI usage error or invalid root/report path
- `3`: unexpected runtime failure

## Scripts

- `npm run dev`
- `npm run typecheck`
- `npm run build`
- `npm test`

## Usage Example

```sh
npm run build
node dist/index.js validate \
  --root ./fixtures/valid-vault \
  --report ./reports/valid-report.md
```

The input root is read-only. Reports must be written outside the input
root. JSON output and auto-fix are not supported. MCP/Plugin is not
included in this PoC.

## Implemented Checks

- Canonical term and alias warnings
- Required document, section, and field errors
- Status vocabulary errors
- Implementation and automation boundary warnings
- Sensitive-pattern candidate warnings

## Public-safe Fixtures

- `fixtures/valid-vault`: expected to pass without issues
- `fixtures/invalid-vault`: expected to fail with validation errors
- `fixtures/boundary-vault`: expected to pass with warnings

## Boundaries

The validator is read-only. MCP/Plugin, CI, JSON output, configurable aliases, LLM-assisted review, auto-fix, source mutation, company code, real company fixtures, and domain meaning judgement are excluded.
