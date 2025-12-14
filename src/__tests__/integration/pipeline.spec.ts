import { MarkdownParserService } from "../../converter/services/markdown-parser.service";
import { DocumentConverterService } from "../../converter/services/document-converter.service";
import { PdfGeneratorService } from "../../converter/services/pdf-generator.service";
import * as fs from "fs";
import * as path from "path";
import {
  assertPdfContainsText,
  assertPdfFileSize,
  assertPdfMinPages,
} from "../utils/pdf-test-helpers";

describe("Integration: Full Pipeline Tests", () => {
  let parser: MarkdownParserService;
  let converter: DocumentConverterService;
  let generator: PdfGeneratorService;

  const testOutputDir = path.join(__dirname, "../../../test-output-pipeline");

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

  it("should convert simple markdown to PDF", async () => {
    const markdown = `# Test Document

This is a **simple** test with *formatting*.`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "simple-test.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const stats = fs.statSync(outputPath);
    expect(stats.size).toBeGreaterThan(0);

    // Verify PDF content
    await assertPdfContainsText(outputPath, [
      "Test Document",
      "simple",
      "test",
      "formatting",
    ]);
    assertPdfFileSize(outputPath, 500); // At least 500 bytes
  });

  it("should handle all markdown features in one document", async () => {
    const markdown = `# Main Title

## Subtitle

This paragraph has **bold**, *italic*, and \`code\`.

### Lists

- Item 1
- Item 2

1. First
2. Second

### Code

\`\`\`javascript
function test() {
  return true;
}
\`\`\`

### Table

| A | B | C |
| --- | --- | --- |
| 1 | 2 | 3 |

### Quote

> This is a quote

---

End.`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "comprehensive-test.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const stats = fs.statSync(outputPath);
    expect(stats.size).toBeGreaterThan(1000); // Should be substantial

    // Verify PDF contains all expected content
    await assertPdfContainsText(outputPath, [
      "Main Title",
      "Subtitle",
      "bold",
      "italic",
      "code",
      "Lists",
      "Item 1",
      "Item 2",
      "First",
      "Second",
      "Code",
      "function test()",
      "return true",
      "Table",
      "Quote",
      "This is a quote",
      "End",
    ]);
    assertPdfFileSize(outputPath, 1000);
  });

  it("should handle empty document gracefully", async () => {
    const markdown = "";

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "empty-test.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    // Empty document should still produce a valid PDF
    assertPdfFileSize(outputPath, 100);
  });

  it("should handle document with only whitespace", async () => {
    const markdown = "   \n\n   \t  \n\n";

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "whitespace-test.pdf");

    await generator.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    // Whitespace-only document should still produce a valid PDF
    assertPdfFileSize(outputPath, 100);
  });
});
