import { MarkdownParserService } from "../../converter/services/markdown-parser.service";
import { DocumentConverterService } from "../../converter/services/document-converter.service";
import { PdfGeneratorService } from "../../converter/services/pdf-generator.service";
import { TokenType } from "../../converter/types/tokens";
import * as fs from "fs";
import * as path from "path";

describe("Benchmark Tests", () => {
  let parser: MarkdownParserService;
  let converter: DocumentConverterService;
  let generator: PdfGeneratorService;

  const testOutputDir = path.join(__dirname, "../../test-output-benchmark");

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

  describe("Parser Performance", () => {
    it("should parse 1000 lines of markdown in under 1 second", () => {
      let markdown = "";
      for (let i = 0; i < 1000; i++) {
        markdown += `Line ${i} with **bold** and *italic* text.\n`;
      }

      const startTime = Date.now();
      const tokens = parser.parse(markdown);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000);
      expect(tokens.length).toBeGreaterThan(0);
    });

    it("should parse complex table with 50 rows in under 200ms", () => {
      let markdown = "| Col1 | Col2 | Col3 | Col4 | Col5 |\n";
      markdown += "| :--- | :---: | ---: | --- | --- |\n";
      for (let i = 0; i < 50; i++) {
        markdown += `| Data${i} | Value${i} | Number${i} | Text${i} | Info${i} |\n`;
      }

      const startTime = Date.now();
      const tokens = parser.parse(markdown);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200);
      const tableTokens = tokens.filter((t) => t.type === TokenType.TABLE_ROW);
      expect(tableTokens.length).toBe(51); // header + 50 rows
    });

    it("should handle deeply nested formatting efficiently", () => {
      const markdown = `# Nested Formatting

${"***Very deeply nested formatting*** ".repeat(100)}

**${"*Alternating* ".repeat(50)}bold**`;

      const startTime = Date.now();
      const tokens = parser.parse(markdown);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(300);
      expect(tokens.length).toBeGreaterThan(0);
    });

    it("should parse 100 code blocks in under 500ms", () => {
      let markdown = "# Code Blocks\n\n";
      for (let i = 0; i < 100; i++) {
        markdown += `\`\`\`javascript\nfunction test${i}() {\n  return ${i};\n}\n\`\`\`\n\n`;
      }

      const startTime = Date.now();
      const tokens = parser.parse(markdown);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500);
      const codeBlocks = tokens.filter((t) => t.type === TokenType.CODE_BLOCK);
      expect(codeBlocks.length).toBe(100);
    });
  });

  describe("Converter Performance", () => {
    it("should convert 500 tokens in under 500ms", async () => {
      let markdown = "";
      for (let i = 0; i < 100; i++) {
        markdown += `# Heading ${i}\n\n`;
        markdown += `Paragraph ${i} with text.\n\n`;
        markdown += `- List item ${i}\n\n`;
        markdown += `\`\`\`\nCode block ${i}\n\`\`\`\n\n`;
      }

      const tokens = parser.parse(markdown);

      const startTime = Date.now();
      const document = await converter.convert(tokens);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500);
      expect(document.elements.length).toBeGreaterThan(0);
    });

    it("should convert large table with 100 rows in under 300ms", async () => {
      let markdown = "| A | B | C |\n| --- | --- | --- |\n";
      for (let i = 0; i < 100; i++) {
        markdown += `| ${i} | ${i * 2} | ${i * 3} |\n`;
      }

      const tokens = parser.parse(markdown);

      const startTime = Date.now();
      const document = await converter.convert(tokens);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(300);
      expect(document.elements.length).toBeGreaterThan(0);
    });
  });

  describe("PDF Generator Performance", () => {
    it("should generate PDF from 200 elements in under 2 seconds", async () => {
      let markdown = "# Performance Test\n\n";
      for (let i = 0; i < 50; i++) {
        markdown += `## Section ${i}\n\n`;
        markdown += `Paragraph ${i} with **bold** and *italic*.\n\n`;
        markdown += `- Item ${i}\n\n`;
        markdown += `\`\`\`\ncode ${i}\n\`\`\`\n\n`;
      }

      const tokens = parser.parse(markdown);
      const document = await converter.convert(tokens);
      const outputPath = path.join(testOutputDir, "benchmark-pdf.pdf");

      const startTime = Date.now();
      await generator.generate(document, outputPath);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000);
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it("should generate PDF with large table in under 1.5 seconds", async () => {
      let markdown =
        "# Large Table\n\n| A | B | C | D | E |\n| --- | --- | --- | --- | --- |\n";
      for (let i = 0; i < 50; i++) {
        markdown += `| ${i} | ${i} | ${i} | ${i} | ${i} |\n`;
      }

      const tokens = parser.parse(markdown);
      const document = await converter.convert(tokens);
      const outputPath = path.join(testOutputDir, "large-table-benchmark.pdf");

      const startTime = Date.now();
      await generator.generate(document, outputPath);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1500);
      expect(fs.existsSync(outputPath)).toBe(true);
    });
  });

  describe("Full Pipeline Performance", () => {
    it("should handle full pipeline (parse + convert + generate) for 100 elements in under 3 seconds", async () => {
      let markdown = "# Full Pipeline Benchmark\n\n";
      for (let i = 0; i < 25; i++) {
        markdown += `## Heading ${i}\n\n`;
        markdown += `Text ${i} with **formatting**.\n\n`;
        markdown += `| A | B |\n| --- | --- |\n| ${i} | ${i} |\n\n`;
      }

      const outputPath = path.join(
        testOutputDir,
        "full-pipeline-benchmark.pdf"
      );

      const startTime = Date.now();
      const tokens = parser.parse(markdown);
      const document = await converter.convert(tokens);
      await generator.generate(document, outputPath);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000);
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it("should process document with 1000+ elements in under 5 seconds", async () => {
      let markdown = "# Large Document Benchmark\n\n";
      for (let i = 0; i < 250; i++) {
        markdown += `## Section ${i}\n\n`;
        markdown += `Paragraph ${i}.\n\n`;
        markdown += `- Item ${i}\n\n`;
        markdown += `> Quote ${i}\n\n`;
      }

      const outputPath = path.join(testOutputDir, "very-large-document.pdf");

      const startTime = Date.now();
      const tokens = parser.parse(markdown);
      const document = await converter.convert(tokens);
      await generator.generate(document, outputPath);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000);
      expect(document.elements.length).toBeGreaterThan(1000);
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it("should handle mixed content document in under 2 seconds", async () => {
      let markdown = "# Mixed Content\n\n";
      for (let i = 0; i < 20; i++) {
        markdown += `## Heading ${i}\n\n`;
        markdown += `Text with **bold** and *italic*.\n\n`;
        markdown += `\`\`\`javascript\nconst x = ${i};\n\`\`\`\n\n`;
        markdown += `| Col1 | Col2 |\n| --- | --- |\n| ${i} | ${i * 2} |\n\n`;
        markdown += `> Quote ${i}\n\n`;
        markdown += `---\n\n`;
      }

      const outputPath = path.join(
        testOutputDir,
        "mixed-content-benchmark.pdf"
      );

      const startTime = Date.now();
      const tokens = parser.parse(markdown);
      const document = await converter.convert(tokens);
      await generator.generate(document, outputPath);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000);
      expect(fs.existsSync(outputPath)).toBe(true);
    });
  });

  describe("Memory Efficiency", () => {
    it("should handle 5000 lines without memory issues", async () => {
      let markdown = "";
      for (let i = 0; i < 5000; i++) {
        markdown += `Line ${i} with some **content**.\n`;
      }

      const tokens = parser.parse(markdown);
      const document = await converter.convert(tokens);
      const outputPath = path.join(testOutputDir, "memory-test.pdf");

      await generator.generate(document, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
      expect(document.elements.length).toBeGreaterThan(0);
    });
  });
});
