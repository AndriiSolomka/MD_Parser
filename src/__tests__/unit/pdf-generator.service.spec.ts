import { Test, TestingModule } from "@nestjs/testing";
import { PdfGeneratorService } from "../../converter/services/pdf-generator.service";
import { Document } from "../../converter/types/document";
import * as fs from "fs";
import * as path from "path";

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
      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(0);
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
      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(1000); // Should be substantial
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
    });
  });
});
