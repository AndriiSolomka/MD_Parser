# Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run All Tests

```bash
# All tests (110 tests)
npm test

# With coverage report
npm run test:cov

# Watch mode for development
npm run test:watch
```

**Expected Result:** ✅ 110 passed, 79.6%+ coverage

---

## CLI Testing

### Basic Syntax

```bash
npm run cli -- <input.md> [output.pdf]
```

### Test All Files Automatically

```bash
./test-all.sh
```

Converts all `.md` files in `test-md/` folder and reports results.

### Manual Testing Examples

```bash
# Complete features test
npm run cli -- test-md/00-all-features.md output/all-features.pdf

# Headings (H1-H6)
npm run cli -- test-md/01-headings-all-levels.md output/headings.pdf

# Text formatting
npm run cli -- test-md/02-text-formatting.md output/formatting.pdf

# Nested lists
npm run cli -- test-md/03-lists-nested.md output/lists.pdf

# Complex tables (9 examples!)
npm run cli -- test-md/04-tables-complex.md output/tables.pdf

# Code blocks (6 languages)
npm run cli -- test-md/05-code-blocks.md output/code.pdf
```

---

## What to Check in Generated PDFs

### ✅ Checklist:

- [ ] **Headings**: Correct size and weight (H1-H6)
- [ ] **Text Formatting**: Bold, italic, bold+italic
- [ ] **Lists**: Proper indentation and numbering
- [ ] **Code Blocks**: Monospace font, gray background
- [ ] **Tables**: Borders and alignment correct
- [ ] **Blockquotes**: Left border and indentation
- [ ] **Horizontal Rules**: Visible lines
- [ ] **Links**: Underlined and blue
- [ ] **Margins**: Proper spacing (72pt)
- [ ] **Page Breaks**: Long content splits correctly

---

## Test Structure

```
src/__tests__/
├── unit/                   # Unit tests
│   ├── markdown-parser.service.spec.ts
│   ├── document-converter.service.spec.ts
│   └── pdf-generator.service.spec.ts
├── integration/            # Integration tests
│   ├── pipeline.spec.ts
│   ├── error-handling.spec.ts
│   ├── advanced-features.spec.ts
│   ├── configuration.spec.ts
│   └── demo-files.spec.ts
└── benchmark/              # Performance tests
    └── benchmark.spec.ts
```

---

## Benchmark Tests

```bash
# Run only benchmark tests
npm test -- benchmark.spec.ts
```

**Expected Results:**
- ✅ Parse 1000 lines < 1s
- ✅ Complex table 50 rows < 200ms
- ✅ Convert 500 tokens < 500ms
- ✅ Generate PDF 200 elements < 2s
- ✅ Full pipeline 1000+ elements < 5s
- ✅ Memory test 5000 lines - no issues

---

## Coverage Metrics

| Metric | Value |
|--------|-------|
| **Tests** | 110 passed |
| **Coverage** | 79.6%+ |
| **Production Code** | ~1,572 lines |
| **Test Code** | ~2,022 lines |
| **Execution Time** | ~3-5 seconds |

---

## Troubleshooting

### "Input file not found"
```bash
ls -la test-md/  # Check files exist
```

### "Input file must be a .md file"
```bash
# Ensure file has .md extension
mv file.txt file.md
```

### PDF not generated
```bash
# Check output folder permissions
mkdir -p output
chmod 755 output
```

### Script permission denied
```bash
chmod +x test-all.sh
```

---

## Quick Verification

```bash
# One command to test everything
npm test && \
npm run cli -- test-md/00-all-features.md output/final-test.pdf && \
open output/final-test.pdf  # macOS
# xdg-open output/final-test.pdf  # Linux
```

**Success! 🚀**
