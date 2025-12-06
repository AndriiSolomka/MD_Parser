import { MarkdownParserService } from "../../converter/services/markdown-parser.service";
import { DocumentConverterService } from "../../converter/services/document-converter.service";
import { PdfGeneratorService } from "../../converter/services/pdf-generator.service";
import * as fs from "fs";
import * as path from "path";

describe("Integration: Advanced Markdown Features", () => {
  let parser: MarkdownParserService;
  let converter: DocumentConverterService;
  let generator: PdfGeneratorService;

  const testOutputDir = path.join(__dirname, "../../../test-output-advanced");

  beforeAll(() => {
    parser = new MarkdownParserService();
    converter = new DocumentConverterService();
    generator = new PdfGeneratorService();

    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test output
    if (fs.existsSync(testOutputDir)) {
      try {
        fs.readdirSync(testOutputDir).forEach((file) => {
          fs.unlinkSync(path.join(testOutputDir, file));
        });
        fs.rmdirSync(testOutputDir);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  it("should handle complex nested lists", async () => {
    const markdown = `# Nested Lists

- Level 1 item 1
  - Level 2 item 1
    - Level 3 item 1
    - Level 3 item 2
  - Level 2 item 2
- Level 1 item 2
  1. Ordered nested 1
  2. Ordered nested 2

1. Top ordered
   - Unordered nested
     1. Deep ordered
   - Another nested`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "nested-lists.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(document.elements.length).toBeGreaterThan(0);
  });

  it("should handle multiple tables in one document", async () => {
    const markdown = `# Tables Test

## First Table

| Name | Age | City |
| :--- | :---: | ---: |
| Alice | 25 | NYC |
| Bob | 30 | LA |

## Second Table

| Product | Price | Stock |
| --- | --- | --- |
| Apple | 1.99 | 100 |
| Banana | 0.99 | 200 |

## Third Table with Alignment

| Left | Center | Right |
| :--- | :---: | ---: |
| A | B | C |
| D | E | F |`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "multiple-tables.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const tables = document.elements.filter((el) => el.type === "table");
    expect(tables.length).toBe(3);
  });

  it("should handle mixed code blocks with different languages", async () => {
    const markdown = `# Code Examples

JavaScript:

\`\`\`javascript
function hello() {
  console.log("Hello World");
}
\`\`\`

Python:

\`\`\`python
def greet(name):
    print(f"Hello {name}")
\`\`\`

Plain text:

\`\`\`
No language specified
Just plain text
\`\`\`

Inline code: \`const x = 42;\``;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "code-languages.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const codeBlocks = document.elements.filter(
      (el) => el.type === "code-block"
    );
    expect(codeBlocks.length).toBe(3);
  });

  it("should handle complex inline formatting combinations", async () => {
    const markdown = `# Formatting Test

This paragraph has **bold**, *italic*, \`code\`, ***bold italic***, **bold with *nested italic***, and *italic with **nested bold***.

Here's a [link with **bold text**](https://example.com) and **bold with [link](https://example.com)**.

Multiple \`inline\` code \`segments\` in **one** paragraph.`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "complex-formatting.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(document.elements.length).toBeGreaterThan(2);
  });

  it("should handle blockquotes with nested formatting", async () => {
    const markdown = `# Quotes

> This is a simple quote.

> This quote has **bold** and *italic* text.
> 
> Multiple paragraphs in quote.
> With \`code\` too.

> Nested **formatting with *italic* inside**.`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "blockquotes.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const quotes = document.elements.filter((el) => el.type === "blockquote");
    expect(quotes.length).toBeGreaterThan(0);
  });

  it("should handle horizontal rules between content", async () => {
    const markdown = `# Section 1

Content before rule.

---

# Section 2

Content after rule.

***

More content.

___

Final section.`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "horizontal-rules.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const rules = document.elements.filter(
      (el) => el.type === "horizontal-rule"
    );
    expect(rules.length).toBe(3);
  });

  it("should handle document with 100+ elements", async () => {
    let markdown = "# Large Document\n\n";
    for (let i = 1; i <= 50; i++) {
      markdown += `## Section ${i}\n\n`;
      markdown += `This is paragraph ${i} with **bold** and *italic*.\n\n`;
      markdown += `- List item ${i}\n\n`;
    }

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "large-document.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(document.elements.length).toBeGreaterThan(100);
    const stats = fs.statSync(outputPath);
    expect(stats.size).toBeGreaterThan(5000);
  });

  it("should handle document with large table", async () => {
    let markdown = "# Large Table\n\n| Col1 | Col2 | Col3 | Col4 | Col5 |\n";
    markdown += "| --- | --- | --- | --- | --- |\n";
    for (let i = 1; i <= 30; i++) {
      markdown += `| Data${i} | Data${i} | Data${i} | Data${i} | Data${i} |\n`;
    }

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "large-table.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
  });
});
