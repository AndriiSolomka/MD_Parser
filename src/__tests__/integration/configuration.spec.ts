import { MarkdownParserService } from "../../converter/services/markdown-parser.service";
import { DocumentConverterService } from "../../converter/services/document-converter.service";
import { PdfGeneratorService } from "../../converter/services/pdf-generator.service";
import * as fs from "fs";
import * as path from "path";
import {
  assertPdfContainsText,
  assertPdfFileSize,
  parsePdf,
} from "../utils/pdf-test-helpers";

describe("Integration: PDF Configuration Tests", () => {
  let parser: MarkdownParserService;
  let converter: DocumentConverterService;
  let generator: PdfGeneratorService;

  const testOutputDir = path.join(__dirname, "../../../test-output-config");

  beforeAll(() => {
    parser = new MarkdownParserService();
    converter = new DocumentConverterService();
    generator = new PdfGeneratorService();

    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testOutputDir)) {
      try {
        fs.readdirSync(testOutputDir).forEach((file) => {
          fs.unlinkSync(path.join(testOutputDir, file));
        });
        fs.rmdirSync(testOutputDir);
      } catch (_error) {}
    }
  });

  it("should respect custom PDF configuration", async () => {
    const markdown = `# Test`;

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "custom-config.pdf");

    await generator.generate(document, outputPath, {
      pageSize: "Letter",
      fontSize: 14,
      margins: {
        top: 60,
        bottom: 60,
        left: 60,
        right: 60,
      },
    });

    expect(fs.existsSync(outputPath)).toBe(true);

    await assertPdfContainsText(outputPath, "Test");
    assertPdfFileSize(outputPath, 500);
  });

  it("should generate PDF with different page sizes", async () => {
    const markdown = "# Page Size Test\n\nTesting different page sizes.";

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);

    const a4Path = path.join(testOutputDir, "pagesize-a4.pdf");
    await generator.generate(document, a4Path, { pageSize: "A4" });
    expect(fs.existsSync(a4Path)).toBe(true);
    await assertPdfContainsText(a4Path, [
      "Page Size Test",
      "Testing different page sizes",
    ]);

    const letterPath = path.join(testOutputDir, "pagesize-letter.pdf");
    await generator.generate(document, letterPath, { pageSize: "Letter" });
    expect(fs.existsSync(letterPath)).toBe(true);
    await assertPdfContainsText(letterPath, [
      "Page Size Test",
      "Testing different page sizes",
    ]);

    const a4Data = await parsePdf(a4Path);
    const letterData = await parsePdf(letterPath);
    expect(a4Data.text).toContain("Page Size Test");
    expect(letterData.text).toContain("Page Size Test");
  });

  it("should generate PDF with custom margins", async () => {
    const markdown = "# Margins Test\n\nTesting custom margins.";

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "custom-margins.pdf");

    await generator.generate(document, outputPath, {
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
    });

    expect(fs.existsSync(outputPath)).toBe(true);

    await assertPdfContainsText(outputPath, [
      "Margins Test",
      "Testing custom margins",
    ]);
  });

  it("should generate PDF with custom font size", async () => {
    const markdown = "# Font Size Test\n\nTesting custom font size.";

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "custom-fontsize.pdf");

    await generator.generate(document, outputPath, { fontSize: 16 });

    expect(fs.existsSync(outputPath)).toBe(true);

    await assertPdfContainsText(outputPath, [
      "Font Size Test",
      "Testing custom font size",
    ]);
  });

  it("should generate PDF with minimal margins", async () => {
    const markdown = "# Minimal Margins\n\nContent with minimal margins.";

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "minimal-margins.pdf");

    await generator.generate(document, outputPath, {
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    expect(fs.existsSync(outputPath)).toBe(true);

    await assertPdfContainsText(outputPath, [
      "Minimal Margins",
      "Content with minimal margins",
    ]);
  });

  it("should generate PDF with large font size", async () => {
    const markdown =
      "# Large Font\n\nTesting large font size for accessibility.";

    const tokens = parser.parse(markdown);
    const document = await converter.convert(tokens);
    const outputPath = path.join(testOutputDir, "large-fontsize.pdf");

    await generator.generate(document, outputPath, { fontSize: 18 });

    expect(fs.existsSync(outputPath)).toBe(true);

    await assertPdfContainsText(outputPath, [
      "Large Font",
      "Testing large font size for accessibility",
    ]);
  });
});
