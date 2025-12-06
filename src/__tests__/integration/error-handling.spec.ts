import { MarkdownParserService } from "../../converter/services/markdown-parser.service";
import { DocumentConverterService } from "../../converter/services/document-converter.service";
import { PdfGeneratorService } from "../../converter/services/pdf-generator.service";
import * as fs from "fs";
import * as path from "path";

describe("Integration: Error Handling", () => {
  let parser: MarkdownParserService;
  let converter: DocumentConverterService;
  let generator: PdfGeneratorService;

  const testOutputDir = path.join(__dirname, "../../../test-output-errors");

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

  it("should handle malformed table gracefully", async () => {
    const markdown = `| A | B |
| --- |
| 1 | 2 | 3 |`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "malformed-table.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it("should handle unclosed code block", async () => {
    const markdown = `# Test

\`\`\`javascript
function test() {
  // No closing fence`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "unclosed-code.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it("should handle mixed nested formatting", async () => {
    const markdown = `Text with **bold *and italic* combined** here.`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "nested-format.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it("should handle markdown with excessive newlines", async () => {
    const markdown = `# Title



With many



empty lines



between content.`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "excessive-newlines.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it("should handle very long paragraphs", async () => {
    const longText =
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(50);
    const markdown = `# Long Text\n\n${longText}`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "long-paragraph.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const stats = fs.statSync(outputPath);
    expect(stats.size).toBeGreaterThan(1000);
  });

  it("should handle special characters in text", async () => {
    const markdown = `# Special Characters

Text with special chars: & < > " ' 

Code with special: \`x < y && y > z\`

**Bold with &amp; entity**`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "special-chars.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it("should handle markdown with only headings", async () => {
    const markdown = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "only-headings.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(document.elements.length).toBe(6);
    expect(document.elements.every((el) => el.type === "heading")).toBe(true);
  });

  it("should handle list with empty items", async () => {
    const markdown = `# List with gaps

- Item 1
- 
- Item 3

1. First
2. 
3. Third`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "list-empty-items.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
  });
});
