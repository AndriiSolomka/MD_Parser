# Markdown to PDF Converter

**Course Work** - "Software Engineering Components"  
**Author**: Соломка Андрій Романович, Група ІМ-31  
НТУУ "КПІ ім. Ігоря Сікорського"

---

## 🚀 Installation

```bash
npm install
```

---

## 🧪 Run Tests

```bash
# All tests
npm test

# Tests with coverage report
npm run test:cov

# Watch mode
npm run test:watch

# Test all markdown files automatically
./test-all.sh
```

---

## 📄 Convert Markdown to PDF

### Basic Command

```bash
npm run cli -- <input.md>
```

### CLI Options

```bash
npm run cli -- [options] <input.md>

Options:
  -o <file>              Output file path
  --page-size <size>     Page size: A4, Letter, Legal (default: A4)
  --margin <n>           Set all margins to n points (default: 72)
  --font-size <n>        Base font size in points (default: 12)
  --line-height <n>      Line spacing multiplier (default: 1.5)
  -h, --help             Show help message
  --version              Show version number
```

### Examples

```bash
# Basic conversion
npm run cli -- test-md/00-all-features.md

# Custom output file
npm run cli -- test-md/00-all-features.md -o result.pdf

# Letter size with custom margins
npm run cli -- test-md/00-all-features.md --page-size Letter --margin 50

# Larger font and line spacing
npm run cli -- test-md/00-all-features.md --font-size 14 --line-height 1.8

# All options combined
npm run cli -- test-md/00-all-features.md -o custom.pdf --page-size Legal --margin 60 --font-size 25
```

---

## ✅ Supported Features

- Headings (H1-H6)
- **Bold**, *italic*, ***bold italic***, `code`
- Lists (ordered, unordered, nested)
- Tables with alignment
- Code blocks with syntax highlighting
- Links, images, blockquotes
- Horizontal rules

---