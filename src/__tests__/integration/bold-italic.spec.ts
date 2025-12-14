import { Test, TestingModule } from "@nestjs/testing";
import { MarkdownParserService } from "../../converter/services/markdown-parser.service";
import { DocumentConverterService } from "../../converter/services/document-converter.service";
import { PdfGeneratorService } from "../../converter/services/pdf-generator.service";
import { parsePdf } from "../utils/pdf-test-helpers";
import * as fs from "fs";
import * as path from "path";

describe("Integration: Bold-Italic Formatting Test", () => {
  let parserService: MarkdownParserService;
  let converterService: DocumentConverterService;
  let pdfService: PdfGeneratorService;

  const outputDir = "test-output-bold-italic";

  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkdownParserService,
        DocumentConverterService,
        PdfGeneratorService,
      ],
    }).compile();

    parserService = module.get<MarkdownParserService>(MarkdownParserService);
    converterService = module.get<DocumentConverterService>(
      DocumentConverterService
    );
    pdfService = module.get<PdfGeneratorService>(PdfGeneratorService);
  });

  it("should render ***bold italic*** text correctly in PDF", async () => {
    const markdown = `# Bold Italic Test

This text has ***bold italic*** formatting.

Also testing ___another bold italic___.

Comparison: **bold only**, *italic only*, and ***bold italic***.`;

    const tokens = parserService.parse(markdown);
    const document = await converterService.convert(tokens);
    const outputPath = path.join(outputDir, "bold-italic-test.pdf");

    await pdfService.generate(document, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);

    const pdfContent = await parsePdf(outputPath);
    expect(pdfContent.text).toContain("bold italic");
    expect(pdfContent.text).toContain("another bold italic");
    expect(pdfContent.text).toContain("bold only");
    expect(pdfContent.text).toContain("italic only");

    expect(pdfContent.text).not.toContain("***");
    expect(pdfContent.text).not.toContain("___");
    expect(pdfContent.text).not.toContain("**");
  });

  it("should correctly parse ***text*** as bold-italic token", () => {
    const markdown = "Text with ***bold italic*** here";
    const tokens = parserService.parse(markdown);

    expect(tokens).toHaveLength(1);
    const paragraph = tokens[0] as any;
    expect(paragraph.formatting).toHaveLength(2);

    const types = paragraph.formatting.map((f: any) => f.type).sort();
    expect(types).toEqual(["bold", "italic"]);
  });

  it("should not confuse *** with ** or *", () => {
    const markdown = "**bold** *italic* ***both***";
    const tokens = parserService.parse(markdown);

    const paragraph = tokens[0] as any;

    expect(paragraph.formatting).toHaveLength(4);

    const types = paragraph.formatting.map((f: any) => f.type).sort();
    expect(types).toEqual(["bold", "bold", "italic", "italic"]);
  });

  afterAll(() => {
    console.log(`\nGenerated PDFs in: ${path.resolve(outputDir)}`);
  });
});
