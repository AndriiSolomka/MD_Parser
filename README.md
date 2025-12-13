# Markdown to PDF Converter

**Course Work** - "Software Engineering Components"  
**Author**: Соломка Андрій Романович, Group ІМ-31  
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
npm run cli -- <input.md> <output.pdf>
```

### Examples

```bash
# Complete feature test (all Markdown features)
npm run cli -- test-md/00-all-features.md output/result.pdf
```

---

## 🔧 PDF Configuration (Programmatic API)

```typescript
import { PdfGeneratorService } from './converter/services/pdf-generator.service';

const generator = new PdfGeneratorService();

await generator.generate(document, 'output.pdf', {
  pageSize: 'A4',        // or 'Letter', 'Legal'
  fontSize: 12,          // base font size
  margins: {
    top: 72,
    bottom: 72,
    left: 72,
    right: 72
  }
});
```

**Default settings:** A4, 12pt font, 72pt margins

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