import { Test, TestingModule } from "@nestjs/testing";
import { DocumentConverterService } from "../../converter/services/document-converter.service";
import { TokenType } from "../../converter/types/tokens";

describe("DocumentConverterService", () => {
  let service: DocumentConverterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentConverterService],
    }).compile();

    service = module.get<DocumentConverterService>(DocumentConverterService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("convert", () => {
    it("should convert heading token to heading element", async () => {
      const tokens = [
        {
          type: TokenType.HEADING,
          level: 1,
          text: "Test Heading",
          formatting: [],
        },
      ];

      const doc = await service.convert(tokens as any);

      expect(doc.elements).toHaveLength(1);
      expect(doc.elements[0].type).toBe("heading");
      expect((doc.elements[0] as any).level).toBe(1);
      expect((doc.elements[0] as any).text).toBe("Test Heading");
      expect((doc.elements[0] as any).id).toBe("test-heading");
    });

    it("should convert paragraph token to paragraph element", async () => {
      const tokens = [
        {
          type: TokenType.PARAGRAPH,
          text: "Test paragraph",
          formatting: [],
        },
      ];

      const doc = await service.convert(tokens as any);

      expect(doc.elements).toHaveLength(1);
      expect(doc.elements[0].type).toBe("paragraph");
      expect((doc.elements[0] as any).text).toBe("Test paragraph");
    });

    it("should group consecutive list items", async () => {
      const tokens = [
        {
          type: TokenType.LIST_ITEM,
          ordered: false,
          text: "Item 1",
          level: 0,
          formatting: [],
        },
        {
          type: TokenType.LIST_ITEM,
          ordered: false,
          text: "Item 2",
          level: 0,
          formatting: [],
        },
        {
          type: TokenType.LIST_ITEM,
          ordered: false,
          text: "Item 3",
          level: 0,
          formatting: [],
        },
      ];

      const doc = await service.convert(tokens as any);

      expect(doc.elements).toHaveLength(1);
      expect(doc.elements[0].type).toBe("list");
      expect((doc.elements[0] as any).ordered).toBe(false);
      expect((doc.elements[0] as any).items).toHaveLength(3);
    });

    it("should convert code block token", async () => {
      const tokens = [
        {
          type: TokenType.CODE_BLOCK,
          language: "javascript",
          code: "const x = 1;",
        },
      ];

      const doc = await service.convert(tokens as any);

      expect(doc.elements).toHaveLength(1);
      expect(doc.elements[0].type).toBe("code-block");
      expect((doc.elements[0] as any).language).toBe("javascript");
      expect((doc.elements[0] as any).code).toBe("const x = 1;");
    });

    it("should group table rows into table element", async () => {
      const tokens = [
        {
          type: TokenType.TABLE_ROW,
          cells: ["Header 1", "Header 2"],
          isHeader: true,
          alignment: ["left", "left"],
        },
        {
          type: TokenType.TABLE_ROW,
          cells: ["Cell 1", "Cell 2"],
          isHeader: false,
        },
        {
          type: TokenType.TABLE_ROW,
          cells: ["Cell 3", "Cell 4"],
          isHeader: false,
        },
      ];

      const doc = await service.convert(tokens as any);

      expect(doc.elements).toHaveLength(1);
      expect(doc.elements[0].type).toBe("table");
      expect((doc.elements[0] as any).headers).toEqual([
        "Header 1",
        "Header 2",
      ]);
      expect((doc.elements[0] as any).rows).toHaveLength(2);
    });

    it("should convert blockquote token", async () => {
      const tokens = [
        {
          type: TokenType.BLOCKQUOTE,
          text: "This is a quote",
          formatting: [],
        },
      ];

      const doc = await service.convert(tokens as any);

      expect(doc.elements).toHaveLength(1);
      expect(doc.elements[0].type).toBe("blockquote");
      expect((doc.elements[0] as any).text).toBe("This is a quote");
    });

    it("should convert horizontal rule token", async () => {
      const tokens = [
        {
          type: TokenType.HORIZONTAL_RULE,
        },
      ];

      const doc = await service.convert(tokens as any);

      expect(doc.elements).toHaveLength(1);
      expect(doc.elements[0].type).toBe("horizontal-rule");
    });

    it("should extract metadata from first heading", async () => {
      const tokens = [
        {
          type: TokenType.HEADING,
          level: 1,
          text: "Document Title",
          formatting: [],
        },
        {
          type: TokenType.PARAGRAPH,
          text: "Content",
          formatting: [],
        },
      ];

      const doc = await service.convert(tokens as any);

      expect(doc.metadata).toBeDefined();
      expect(doc.metadata?.title).toBe("Document Title");
    });

    it("should handle mixed content types", async () => {
      const tokens = [
        {
          type: TokenType.HEADING,
          level: 1,
          text: "Title",
          formatting: [],
        },
        {
          type: TokenType.PARAGRAPH,
          text: "Paragraph",
          formatting: [],
        },
        {
          type: TokenType.LIST_ITEM,
          ordered: false,
          text: "Item",
          level: 0,
          formatting: [],
        },
        {
          type: TokenType.CODE_BLOCK,
          language: "js",
          code: "code",
        },
      ];

      const doc = await service.convert(tokens as any);

      expect(doc.elements.length).toBeGreaterThan(0);
      expect(doc.elements.some((e) => e.type === "heading")).toBe(true);
      expect(doc.elements.some((e) => e.type === "paragraph")).toBe(true);
      expect(doc.elements.some((e) => e.type === "list")).toBe(true);
      expect(doc.elements.some((e) => e.type === "code-block")).toBe(true);
    });
  });

  describe("generateId", () => {
    it("should generate slug from heading text", async () => {
      const tokens = [
        {
          type: TokenType.HEADING,
          level: 2,
          text: "Hello World Test",
          formatting: [],
        },
      ];

      const doc = await service.convert(tokens as any);
      const heading = doc.elements[0] as any;

      expect(heading.id).toBe("hello-world-test");
    });

    it("should handle special characters", async () => {
      const tokens = [
        {
          type: TokenType.HEADING,
          level: 2,
          text: "Test & Example #1",
          formatting: [],
        },
      ];

      const doc = await service.convert(tokens as any);
      const heading = doc.elements[0] as any;

      expect(heading.id).toMatch(/test-example-1/);
    });
  });
});
