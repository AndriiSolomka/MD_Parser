import { MarkdownParserService } from "../../converter/services/markdown-parser.service";
import { DocumentConverterService } from "../../converter/services/document-converter.service";
import { PdfGeneratorService } from "../../converter/services/pdf-generator.service";
import * as fs from "fs";
import * as path from "path";

describe("Integration: Real-world Demo Files", () => {
  let parser: MarkdownParserService;
  let converter: DocumentConverterService;
  let generator: PdfGeneratorService;

  const testOutputDir = path.join(__dirname, "../../../test-output-demos");
  const demoDir = path.join(__dirname, "../../../demo");

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

  if (fs.existsSync(demoDir)) {
    const demoFiles = fs.readdirSync(demoDir).filter((f) => f.endsWith(".md"));

    demoFiles.forEach((file) => {
      it(`should convert demo/${file} to PDF`, async () => {
        const inputPath = path.join(demoDir, file);
        const markdown = fs.readFileSync(inputPath, "utf-8");

        const tokens = parser.parse(markdown);
        const document = await converter.convert(tokens, demoDir);
        const outputPath = path.join(
          testOutputDir,
          file.replace(".md", ".pdf")
        );

        await generator.generate(document, outputPath);

        expect(fs.existsSync(outputPath)).toBe(true);
        const stats = fs.statSync(outputPath);
        expect(stats.size).toBeGreaterThan(0);
      });
    });
  } else {
    it("should skip demo file tests if demo directory does not exist", () => {
      expect(true).toBe(true);
    });
  }
});
