import { Test, TestingModule } from "@nestjs/testing";
import { MarkdownParserService } from "../../converter/services/markdown-parser.service";
import { TokenType, ListItemToken } from "../../converter/types/tokens";

describe("MarkdownParserService - Multi-line Lists", () => {
  let service: MarkdownParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarkdownParserService],
    }).compile();

    service = module.get<MarkdownParserService>(MarkdownParserService);
  });

  describe("Multi-line list items", () => {
    it("should parse unordered list item with continuation lines", () => {
      const markdown = `- This is a list item that spans
  multiple lines with proper indentation.
  The continuation should be part of the same list item.`;

      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.LIST_ITEM);
      const listItem = tokens[0] as ListItemToken;
      expect(listItem.text).toBe(
        "This is a list item that spans multiple lines with proper indentation. The continuation should be part of the same list item."
      );
    });

    it("should parse ordered list item with continuation lines", () => {
      const markdown = `1. First item that continues
   on the next line
   and even a third line.`;

      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.LIST_ITEM);
      const listItem = tokens[0] as ListItemToken;
      expect(listItem.text).toBe(
        "First item that continues on the next line and even a third line."
      );
    });

    it("should parse multiple list items with some having continuations", () => {
      const markdown = `- First item
- Second item with continuation
  on the next line.
- Third item`;

      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.LIST_ITEM);
      expect((tokens[0] as ListItemToken).text).toBe("First item");

      expect(tokens[1].type).toBe(TokenType.LIST_ITEM);
      expect((tokens[1] as ListItemToken).text).toBe(
        "Second item with continuation on the next line."
      );

      expect(tokens[2].type).toBe(TokenType.LIST_ITEM);
      expect((tokens[2] as ListItemToken).text).toBe("Third item");
    });

    it("should handle nested list items with continuations", () => {
      const markdown = `- Parent item with continuation
  that spans multiple lines.
  - Nested item also with
    continuation lines.`;

      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(2);

      const parent = tokens[0] as ListItemToken;
      expect(parent.level).toBe(0);
      expect(parent.text).toBe(
        "Parent item with continuation that spans multiple lines."
      );

      const nested = tokens[1] as ListItemToken;
      expect(nested.level).toBe(1);
      expect(nested.text).toBe("Nested item also with continuation lines.");
    });

    it("should stop continuation at blank line", () => {
      const markdown = `- Item with content

This should NOT be part of the list item.`;

      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.LIST_ITEM);
      expect((tokens[0] as ListItemToken).text).toBe("Item with content");
      expect(tokens[1].type).toBe(TokenType.PARAGRAPH);
    });

    it("should preserve inline formatting in multi-line list items", () => {
      const markdown = `- Item with **bold text** that continues
  on the next line with *italic text*.`;

      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(1);
      const listItem = tokens[0] as ListItemToken;
      expect(listItem.text).toContain("bold text");
      expect(listItem.text).toContain("italic text");
      expect(listItem.formatting).toBeDefined();
      expect(listItem.formatting!.length).toBeGreaterThan(0);
    });

    it("should handle continuation with different indentation levels", () => {
      const markdown = `1. Item with two spaces
  continuation.

2. Item with three spaces
   continuation.`;

      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(2);
      expect((tokens[0] as ListItemToken).text).toBe(
        "Item with two spaces continuation."
      );
      expect((tokens[1] as ListItemToken).text).toBe(
        "Item with three spaces continuation."
      );
    });

    it("should not treat non-indented lines as continuations", () => {
      const markdown = `- First item
Not indented, so this is a paragraph.`;

      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.LIST_ITEM);
      expect(tokens[1].type).toBe(TokenType.PARAGRAPH);
    });
  });
});
