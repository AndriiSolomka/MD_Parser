import { Test, TestingModule } from "@nestjs/testing";
import { PdfGeneratorService } from "../../converter/services/pdf-generator.service";
import { Document, TableLayoutInfo } from "../../converter/types/document";
import * as fs from "fs";
import * as path from "path";
import {
  assertPdfContainsText,
  assertPdfPageCount,
  parsePdf,
  getPdfPageDimensions,
} from "../utils/pdf-test-helpers";

describe("PdfGeneratorService", () => {
  let service: PdfGeneratorService;
  const testOutputDir = path.join(__dirname, "../../../test-output");

  beforeAll(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfGeneratorService],
    }).compile();

    service = module.get<PdfGeneratorService>(PdfGeneratorService);
  });

  afterAll(() => {
    // Clean up test output files
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

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generate", () => {
    it("should generate PDF with heading", async () => {
      const doc: Document = {
        elements: [
          {
            type: "heading",
            level: 1,
            text: "Test Heading",
            id: "test-heading",
          },
        ],
        metadata: {
          title: "Test Document",
        },
      };

      const outputPath = path.join(testOutputDir, "heading-test.pdf");
      await service.generate(doc, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      await assertPdfContainsText(outputPath, "Test Heading");
    });

    it("should generate PDF with paragraph", async () => {
      const doc: Document = {
        elements: [
          {
            type: "paragraph",
            text: "This is a test paragraph with some content.",
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "paragraph-test.pdf");
      await service.generate(doc, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      await assertPdfContainsText(
        outputPath,
        "This is a test paragraph with some content."
      );
    });

    it("should generate PDF with list", async () => {
      const doc: Document = {
        elements: [
          {
            type: "list",
            ordered: false,
            items: [
              { text: "Item 1", level: 0 },
              { text: "Item 2", level: 0 },
              { text: "Item 3", level: 0 },
            ],
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "list-test.pdf");
      await service.generate(doc, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      await assertPdfContainsText(outputPath, ["Item 1", "Item 2", "Item 3"]);
    });

    it("should generate PDF with code block", async () => {
      const doc: Document = {
        elements: [
          {
            type: "code-block",
            language: "javascript",
            code: "const x = 1;\nconst y = 2;\nconsole.log(x + y);",
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "code-test.pdf");
      await service.generate(doc, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      await assertPdfContainsText(outputPath, [
        "const x = 1;",
        "const y = 2;",
        "console.log(x + y);",
      ]);
    });

    it("should generate PDF with table", async () => {
      const doc: Document = {
        elements: [
          {
            type: "table",
            headers: ["Column 1", "Column 2", "Column 3"],
            rows: [
              ["A1", "B1", "C1"],
              ["A2", "B2", "C2"],
              ["A3", "B3", "C3"],
            ],
            alignment: ["left", "center", "right"],
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "table-test.pdf");
      await service.generate(doc, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      await assertPdfContainsText(outputPath, [
        "Column 1",
        "Column 2",
        "Column 3",
        "A1",
        "B1",
        "C1",
        "A2",
        "B2",
        "C2",
        "A3",
        "B3",
        "C3",
      ]);
    });

    it("should report table layout spanning available width", async () => {
      const doc: Document = {
        elements: [
          {
            type: "table",
            headers: ["H1", "H2", "H3"],
            rows: [
              ["R1C1", "R1C2", "R1C3"],
              ["R2C1", "R2C2", "R2C3"],
            ],
            alignment: ["left", "center", "right"],
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "table-layout-width.pdf");
      const layouts: TableLayoutInfo[] = [];

      await service.generate(doc, outputPath, {
        onTableLayout: (info) => layouts.push(info),
      });

      expect(fs.existsSync(outputPath)).toBe(true);
      expect(layouts.length).toBeGreaterThan(0);
      const layout = layouts[0];
      expect(layout.headersCount).toBe(3);
      expect(layout.columnWidths.length).toBe(3);
      expect(layout.totalWidth).toBeGreaterThan(0);
      const tolerance = 1; // allow for floating point rounding
      expect(
        Math.abs(layout.availableWidth - layout.totalWidth)
      ).toBeLessThanOrEqual(tolerance);
    });

    it("should generate PDF with blockquote", async () => {
      const doc: Document = {
        elements: [
          {
            type: "blockquote",
            text: "This is a famous quote from someone important.",
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "blockquote-test.pdf");
      await service.generate(doc, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      await assertPdfContainsText(
        outputPath,
        "This is a famous quote from someone important."
      );
    });

    it("should generate PDF with horizontal rule", async () => {
      const doc: Document = {
        elements: [
          {
            type: "paragraph",
            text: "Before rule",
          },
          {
            type: "horizontal-rule",
          },
          {
            type: "paragraph",
            text: "After rule",
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "hr-test.pdf");
      await service.generate(doc, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      await assertPdfContainsText(outputPath, ["Before rule", "After rule"]);
    });

    it("should generate PDF with mixed content", async () => {
      const doc: Document = {
        elements: [
          {
            type: "heading",
            level: 1,
            text: "Main Title",
            id: "main-title",
          },
          {
            type: "paragraph",
            text: "This is an introductory paragraph.",
          },
          {
            type: "heading",
            level: 2,
            text: "Section 1",
            id: "section-1",
          },
          {
            type: "list",
            ordered: true,
            items: [
              { text: "First point", level: 0 },
              { text: "Second point", level: 0 },
            ],
          },
          {
            type: "code-block",
            language: "typescript",
            code: 'function hello() {\n  console.log("Hello");\n}',
          },
          {
            type: "table",
            headers: ["Name", "Age"],
            rows: [
              ["Alice", "25"],
              ["Bob", "30"],
            ],
          },
          {
            type: "blockquote",
            text: "A wise quote",
          },
          {
            type: "horizontal-rule",
          },
        ],
        metadata: {
          title: "Complex Document",
        },
      };

      const outputPath = path.join(testOutputDir, "complex-test.pdf");
      await service.generate(doc, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      await assertPdfContainsText(outputPath, [
        "Main Title",
        "This is an introductory paragraph.",
        "Section 1",
        "First point",
        "Second point",
        "function hello()",
        "Name",
        "Age",
        "Alice",
        "25",
        "A wise quote",
      ]);
    });

    it("should respect custom page configuration", async () => {
      const doc: Document = {
        elements: [
          {
            type: "paragraph",
            text: "Test paragraph",
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "config-test.pdf");
      await service.generate(doc, outputPath, {
        pageSize: "Letter",
        fontSize: 14,
      });

      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify page size metadata
      const pdfData = await parsePdf(outputPath);
      expect(pdfData.numpages).toBeGreaterThan(0);
    });

    it("should verify PDF contains heading text", async () => {
      const doc: Document = {
        elements: [
          {
            type: "heading",
            level: 1,
            text: "Unique Test Heading",
            id: "unique-heading",
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "verify-heading.pdf");
      await service.generate(doc, outputPath);

      const pdfData = await parsePdf(outputPath);
      expect(pdfData.text).toContain("Unique Test Heading");
    });

    it("should verify PDF contains paragraph text", async () => {
      const doc: Document = {
        elements: [
          {
            type: "paragraph",
            text: "This is a unique test paragraph with specific content.",
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "verify-paragraph.pdf");
      await service.generate(doc, outputPath);

      const pdfData = await parsePdf(outputPath);
      expect(pdfData.text).toContain("unique test paragraph");
    });

    it("should verify PDF contains list items", async () => {
      const doc: Document = {
        elements: [
          {
            type: "list",
            ordered: false,
            items: [
              { text: "First unique item", level: 0 },
              { text: "Second unique item", level: 0 },
              { text: "Third unique item", level: 0 },
            ],
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "verify-list.pdf");
      await service.generate(doc, outputPath);

      const pdfData = await parsePdf(outputPath);
      expect(pdfData.text).toContain("First unique item");
      expect(pdfData.text).toContain("Second unique item");
      expect(pdfData.text).toContain("Third unique item");
    });

    it("should verify PDF contains code block", async () => {
      const doc: Document = {
        elements: [
          {
            type: "code-block",
            language: "javascript",
            code: "const uniqueVariable = 42;",
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "verify-code.pdf");
      await service.generate(doc, outputPath);

      const pdfData = await parsePdf(outputPath);
      expect(pdfData.text).toContain("uniqueVariable");
    });

    it("should verify PDF contains table data", async () => {
      const doc: Document = {
        elements: [
          {
            type: "table",
            headers: ["Product", "Price", "Stock"],
            rows: [
              ["Widget", "$19.99", "100"],
              ["Gadget", "$29.99", "50"],
            ],
            alignment: ["left", "center", "right"],
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "verify-table.pdf");
      await service.generate(doc, outputPath);

      const pdfData = await parsePdf(outputPath);
      expect(pdfData.text).toContain("Product");
      expect(pdfData.text).toContain("Widget");
      expect(pdfData.text).toContain("$19.99");
    });

    it("should verify triple emphasis renders as bold and italic", async () => {
      const doc: Document = {
        elements: [
          {
            type: "paragraph",
            text: "***bold and italic***",
            formatting: [
              {
                type: "bold",
                start: 0,
                end: 21,
              },
              {
                type: "italic",
                start: 0,
                end: 21,
              },
            ],
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "verify-triple-emphasis.pdf");
      await service.generate(doc, outputPath);

      const pdfData = await parsePdf(outputPath);
      // Should contain the text without visible asterisks
      expect(pdfData.text).toContain("bold and italic");
      expect(pdfData.text).not.toContain("***");
    });

    it("should verify links don't bleed into surrounding text", async () => {
      const doc: Document = {
        elements: [
          {
            type: "paragraph",
            text: "[Google](https://google.com) for search.",
            formatting: [
              {
                type: "link",
                start: 0,
                end: 28,
                url: "https://google.com",
              },
            ],
          },
        ],
      };

      const outputPath = path.join(testOutputDir, "verify-link.pdf");
      await service.generate(doc, outputPath);

      const pdfData = await parsePdf(outputPath);
      // Should contain link text and surrounding text
      expect(pdfData.text).toContain("Google");
      expect(pdfData.text).toContain("for search");
    });

    it("should handle page size configuration correctly", async () => {
      const doc: Document = {
        elements: [
          {
            type: "paragraph",
            text: "Testing A5 page size",
          },
        ],
      };

      const outputPathA4 = path.join(testOutputDir, "page-size-a4.pdf");
      const outputPathA5 = path.join(testOutputDir, "page-size-a5.pdf");

      await service.generate(doc, outputPathA4, { pageSize: "A4" });
      await service.generate(doc, outputPathA5, { pageSize: "A5" });

      const pdfDataA4 = await parsePdf(outputPathA4);
      const pdfDataA5 = await parsePdf(outputPathA5);

      // Both should contain the text
      expect(pdfDataA4.text).toContain("Testing A5 page size");
      expect(pdfDataA5.text).toContain("Testing A5 page size");

      // Check dimensions
      const dimA4 = await getPdfPageDimensions(outputPathA4);
      const dimA5 = await getPdfPageDimensions(outputPathA5);

      // A4: 595.28 x 841.89
      expect(dimA4.width).toBeCloseTo(595.28, 1);
      expect(dimA4.height).toBeCloseTo(841.89, 1);

      // A5: 419.53 x 595.28
      expect(dimA5.width).toBeCloseTo(419.53, 1);
      expect(dimA5.height).toBeCloseTo(595.28, 1);
    });
  });
});
