import { Test, TestingModule } from "@nestjs/testing";
import { MarkdownParserService } from "../../converter/services/markdown-parser.service";
import { TokenType } from "../../converter/types/tokens";

describe("MarkdownParserService", () => {
  let service: MarkdownParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarkdownParserService],
    }).compile();

    service = module.get<MarkdownParserService>(MarkdownParserService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("Headings", () => {
    it("should parse H1 heading", () => {
      const markdown = "# Main Title";
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.HEADING);
      expect((tokens[0] as any).level).toBe(1);
      expect((tokens[0] as any).text).toBe("Main Title");
    });

    it("should parse all heading levels", () => {
      const markdown = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(6);
      for (let i = 0; i < 6; i++) {
        expect(tokens[i].type).toBe(TokenType.HEADING);
        expect((tokens[i] as any).level).toBe(i + 1);
      }
    });

    it("should extract inline formatting from headings", () => {
      const markdown = "# **Bold** and *italic* heading";
      const tokens = service.parse(markdown);

      expect(tokens[0].type).toBe(TokenType.HEADING);
      const heading = tokens[0] as any;
      expect(heading.formatting).toBeDefined();
      expect(heading.formatting.length).toBeGreaterThan(0);
    });
  });

  describe("Paragraphs", () => {
    it("should parse simple paragraph", () => {
      const markdown = "This is a simple paragraph.";
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.PARAGRAPH);
      expect((tokens[0] as any).text).toBe("This is a simple paragraph.");
    });

    it("should merge multi-line paragraphs", () => {
      const markdown = `This is line one
This is line two
This is line three`;
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.PARAGRAPH);
      expect((tokens[0] as any).text).toContain("line one");
      expect((tokens[0] as any).text).toContain("line two");
    });

    it("should separate paragraphs with blank lines", () => {
      const markdown = `First paragraph

Second paragraph`;
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.PARAGRAPH);
      expect(tokens[1].type).toBe(TokenType.PARAGRAPH);
    });
  });

  describe("Inline Formatting", () => {
    it("should detect bold with **", () => {
      const markdown = "This is **bold** text";
      const tokens = service.parse(markdown);

      const paragraph = tokens[0] as any;
      expect(paragraph.formatting).toBeDefined();
      const boldFormat = paragraph.formatting.find(
        (f: any) => f.type === "bold"
      );
      expect(boldFormat).toBeDefined();
    });

    it("should detect bold with __", () => {
      const markdown = "This is __bold__ text";
      const tokens = service.parse(markdown);

      const paragraph = tokens[0] as any;
      const boldFormat = paragraph.formatting.find(
        (f: any) => f.type === "bold"
      );
      expect(boldFormat).toBeDefined();
    });

    it("should detect italic with *", () => {
      const markdown = "This is *italic* text";
      const tokens = service.parse(markdown);

      const paragraph = tokens[0] as any;
      const italicFormat = paragraph.formatting.find(
        (f: any) => f.type === "italic"
      );
      expect(italicFormat).toBeDefined();
    });

    it("should detect italic with _", () => {
      const markdown = "This is _italic_ text";
      const tokens = service.parse(markdown);

      const paragraph = tokens[0] as any;
      const italicFormat = paragraph.formatting.find(
        (f: any) => f.type === "italic"
      );
      expect(italicFormat).toBeDefined();
    });

    it("should detect inline code", () => {
      const markdown = "This is `code` text";
      const tokens = service.parse(markdown);

      const paragraph = tokens[0] as any;
      const codeFormat = paragraph.formatting.find(
        (f: any) => f.type === "code"
      );
      expect(codeFormat).toBeDefined();
    });

    it("should detect links", () => {
      const markdown = "Check out [Google](https://google.com)";
      const tokens = service.parse(markdown);

      const paragraph = tokens[0] as any;
      const linkFormat = paragraph.formatting.find(
        (f: any) => f.type === "link"
      );
      expect(linkFormat).toBeDefined();
      expect(linkFormat.url).toBe("https://google.com");
    });

    it("should handle multiple formatting in same text", () => {
      const markdown = "Text with **bold**, *italic*, and `code`";
      const tokens = service.parse(markdown);

      const paragraph = tokens[0] as any;
      expect(paragraph.formatting.length).toBe(3);
    });
  });

  describe("Lists", () => {
    it("should parse unordered list with -", () => {
      const markdown = `- Item 1
- Item 2
- Item 3`;
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(3);
      tokens.forEach((token) => {
        expect(token.type).toBe(TokenType.LIST_ITEM);
        expect((token as any).ordered).toBe(false);
      });
    });

    it("should parse unordered list with *", () => {
      const markdown = `* Item 1
* Item 2`;
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.LIST_ITEM);
      expect((tokens[0] as any).ordered).toBe(false);
    });

    it("should parse ordered list", () => {
      const markdown = `1. First item
2. Second item
3. Third item`;
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(3);
      tokens.forEach((token) => {
        expect(token.type).toBe(TokenType.LIST_ITEM);
        expect((token as any).ordered).toBe(true);
      });
    });

    it("should handle nested lists", () => {
      const markdown = `- Item 1
  - Nested item
- Item 2`;
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(3);
      expect((tokens[1] as any).level).toBeGreaterThan(0);
    });
  });

  describe("Code Blocks", () => {
    it("should parse code block without language", () => {
      const markdown = "```\nconst x = 1;\n```";
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.CODE_BLOCK);
      expect((tokens[0] as any).code).toBe("const x = 1;");
      expect((tokens[0] as any).language).toBeNull();
    });

    it("should parse code block with language", () => {
      const markdown = "```javascript\nconst x = 1;\n```";
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.CODE_BLOCK);
      expect((tokens[0] as any).language).toBe("javascript");
    });

    it("should preserve code block formatting", () => {
      const markdown = "```\nline 1\n  indented line\nline 3\n```";
      const tokens = service.parse(markdown);

      const code = (tokens[0] as any).code;
      expect(code).toContain("  indented line");
    });
  });

  describe("Tables", () => {
    it("should parse simple table", () => {
      const markdown = `| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |
| Cell 3 | Cell 4 |`;
      const tokens = service.parse(markdown);

      const tableTokens = tokens.filter((t) => t.type === TokenType.TABLE_ROW);
      expect(tableTokens.length).toBeGreaterThan(0);

      const headerRow = tableTokens.find((t: any) => t.isHeader);
      expect(headerRow).toBeDefined();
      expect((headerRow as any).cells).toContain("Header 1");
    });

    it("should parse table alignment", () => {
      const markdown = `| Left | Center | Right |
| :--- | :---: | ---: |
| L | C | R |`;
      const tokens = service.parse(markdown);

      const headerRow = tokens.find(
        (t: any) => t.type === TokenType.TABLE_ROW && t.isHeader
      ) as any;
      expect(headerRow.alignment).toBeDefined();
      expect(headerRow.alignment[0]).toBe("left");
      expect(headerRow.alignment[1]).toBe("center");
      expect(headerRow.alignment[2]).toBe("right");
    });
  });

  describe("Images", () => {
    it("should parse image", () => {
      const markdown = "![Alt text](image.png)";
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.IMAGE);
      expect((tokens[0] as any).alt).toBe("Alt text");
      expect((tokens[0] as any).url).toBe("image.png");
    });

    it("should parse image with URL", () => {
      const markdown = "![Logo](https://example.com/logo.png)";
      const tokens = service.parse(markdown);

      expect(tokens[0].type).toBe(TokenType.IMAGE);
      expect((tokens[0] as any).url).toBe("https://example.com/logo.png");
    });
  });

  describe("Blockquotes", () => {
    it("should parse blockquote", () => {
      const markdown = "> This is a quote";
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.BLOCKQUOTE);
      expect((tokens[0] as any).text).toBe("This is a quote");
    });

    it("should handle blockquote with inline formatting", () => {
      const markdown = "> This is **bold** quote";
      const tokens = service.parse(markdown);

      const quote = tokens[0] as any;
      expect(quote.formatting).toBeDefined();
    });
  });

  describe("Horizontal Rules", () => {
    it("should parse horizontal rule with ---", () => {
      const markdown = "---";
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.HORIZONTAL_RULE);
    });

    it("should parse horizontal rule with ***", () => {
      const markdown = "***";
      const tokens = service.parse(markdown);

      expect(tokens[0].type).toBe(TokenType.HORIZONTAL_RULE);
    });

    it("should parse horizontal rule with ___", () => {
      const markdown = "___";
      const tokens = service.parse(markdown);

      expect(tokens[0].type).toBe(TokenType.HORIZONTAL_RULE);
    });
  });

  describe("Complex Documents", () => {
    it("should parse document with mixed content", () => {
      const markdown = `# Title

This is a paragraph with **bold** and *italic*.

## Subtitle

- List item 1
- List item 2

\`\`\`javascript
const x = 1;
\`\`\`

> A quote

---`;
      const tokens = service.parse(markdown);

      expect(tokens.length).toBeGreaterThan(5);
      expect(tokens.some((t) => t.type === TokenType.HEADING)).toBe(true);
      expect(tokens.some((t) => t.type === TokenType.PARAGRAPH)).toBe(true);
      expect(tokens.some((t) => t.type === TokenType.LIST_ITEM)).toBe(true);
      expect(tokens.some((t) => t.type === TokenType.CODE_BLOCK)).toBe(true);
      expect(tokens.some((t) => t.type === TokenType.BLOCKQUOTE)).toBe(true);
      expect(tokens.some((t) => t.type === TokenType.HORIZONTAL_RULE)).toBe(
        true
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty input", () => {
      const tokens = service.parse("");
      expect(tokens).toEqual([]);
    });

    it("should handle whitespace-only input", () => {
      const tokens = service.parse("   \n\n   \t  ");
      expect(tokens).toEqual([]);
    });

    it("should handle null-like input gracefully", () => {
      const tokens = service.parse(null as unknown as string);
      expect(tokens).toEqual([]);
    });

    it("should handle unclosed code blocks", () => {
      const markdown = "```javascript\nconst x = 1;";
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.CODE_BLOCK);
      expect((tokens[0] as any).code).toBe("const x = 1;");
    });

    it("should handle bold+italic combined ***text***", () => {
      const markdown = "This is ***bold italic*** text";
      const tokens = service.parse(markdown);

      const paragraph = tokens[0] as any;
      expect(paragraph.formatting.length).toBeGreaterThan(0);
    });

    it("should handle multiple formatting in same word", () => {
      const markdown = "**bold** and *italic* and `code` here";
      const tokens = service.parse(markdown);

      const paragraph = tokens[0] as any;
      expect(paragraph.formatting.length).toBe(3);
    });

    it("should handle list with + marker", () => {
      const markdown = "+ Item 1\n+ Item 2";
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.LIST_ITEM);
      expect((tokens[0] as any).ordered).toBe(false);
    });

    it("should handle deeply nested lists", () => {
      const markdown = "- Level 0\n  - Level 1\n    - Level 2";
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(3);
      expect((tokens[0] as any).level).toBe(0);
      expect((tokens[1] as any).level).toBe(1);
      expect((tokens[2] as any).level).toBe(2);
    });

    it("should handle table without alignment colons", () => {
      const markdown = "| A | B |\n| --- | --- |\n| 1 | 2 |";
      const tokens = service.parse(markdown);

      const headerRow = tokens.find((t: any) => t.isHeader) as any;
      expect(headerRow).toBeDefined();
      expect(headerRow.alignment).toEqual(["left", "left"]);
    });

    it("should handle heading without space after #", () => {
      const markdown = "#NoSpace";
      const tokens = service.parse(markdown);

      // Should be treated as paragraph, not heading
      expect(tokens[0].type).toBe(TokenType.PARAGRAPH);
    });

    it("should handle multiple consecutive empty lines", () => {
      const markdown = "Para 1\n\n\n\n\nPara 2";
      const tokens = service.parse(markdown);

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.PARAGRAPH);
      expect(tokens[1].type).toBe(TokenType.PARAGRAPH);
    });

    it("should preserve code block indentation", () => {
      const markdown = "```\n  indented\n    more indented\n```";
      const tokens = service.parse(markdown);

      const code = (tokens[0] as any).code;
      expect(code).toContain("  indented");
      expect(code).toContain("    more indented");
    });

    it("should handle image with empty alt text", () => {
      const markdown = "![](image.png)";
      const tokens = service.parse(markdown);

      expect(tokens[0].type).toBe(TokenType.IMAGE);
      expect((tokens[0] as any).alt).toBe("");
    });
  });
});
