import { Injectable, Logger } from "@nestjs/common";
import {
  Token,
  TokenType,
  HeadingToken,
  ParagraphToken,
  ListItemToken,
  CodeBlockToken,
  TableRowToken,
  ImageToken,
  BlockquoteToken,
  HorizontalRuleToken,
  InlineFormat,
} from "../types/tokens";

/**
 * MarkdownParserService
 *
 * Parses raw markdown text into a list of tokens.
 * Supports CommonMark syntax including:
 * - Headings (# to ######)
 * - Bold (**text** or __text__)
 * - Italic (*text* or _text_)
 * - Bold+Italic (***text*** or ___text___)
 * - Inline code (`code`)
 * - Code blocks (```language)
 * - Unordered lists (-, *, +)
 * - Ordered lists (1. 2. 3.)
 * - Links ([text](url))
 * - Images (![alt](url))
 * - Tables (pipe-separated with alignment)
 * - Blockquotes (> text)
 * - Horizontal rules (---, ***, ___)
 */
@Injectable()
export class MarkdownParserService {
  private readonly logger = new Logger(MarkdownParserService.name);

  /**
   * Parse markdown text into tokens
   * @param markdown - Raw markdown string
   * @returns Array of parsed tokens
   */
  parse(markdown: string): Token[] {
    // Handle empty or whitespace-only input
    if (!markdown || !markdown.trim()) {
      this.logger.debug("Empty markdown input received");
      return [];
    }

    const lines = markdown.split("\n");
    const tokens: Token[] = [];
    let currentLine = 0;

    // State tracking
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let codeBlockLanguage: string | null = null;
    let codeBlockStartLine = 0;

    let paragraphLines: string[] = [];
    let paragraphStartLine = 0;

    let tableAlignment: ("left" | "center" | "right")[] | undefined;
    let inTable = false;

    /**
     * Flush accumulated paragraph lines into a paragraph token
     */
    const flushParagraph = (): void => {
      if (paragraphLines.length > 0) {
        const text = paragraphLines.join("\n").trim();
        if (text) {
          tokens.push({
            type: TokenType.PARAGRAPH,
            text,
            formatting: this.extractInlineFormatting(text),
            line: paragraphStartLine,
          } as ParagraphToken);
        }
        paragraphLines = [];
      }
    };

    while (currentLine < lines.length) {
      const line = lines[currentLine];
      const trimmed = line.trim();

      // ==================== CODE BLOCKS ====================
      if (trimmed.startsWith("```")) {
        flushParagraph();
        inTable = false;

        if (!inCodeBlock) {
          // Start of code block
          inCodeBlock = true;
          codeBlockLanguage = trimmed.slice(3).trim() || null;
          codeBlockLines = [];
          codeBlockStartLine = currentLine;
        } else {
          // End of code block
          tokens.push({
            type: TokenType.CODE_BLOCK,
            language: codeBlockLanguage,
            code: codeBlockLines.join("\n"),
            line: codeBlockStartLine,
          } as CodeBlockToken);
          inCodeBlock = false;
          codeBlockLines = [];
          codeBlockLanguage = null;
        }
        currentLine++;
        continue;
      }

      // Inside code block - preserve everything as-is
      if (inCodeBlock) {
        codeBlockLines.push(line);
        currentLine++;
        continue;
      }

      // ==================== EMPTY LINE ====================
      if (!trimmed) {
        flushParagraph();
        inTable = false;
        currentLine++;
        continue;
      }

      // ==================== HORIZONTAL RULE ====================
      if (this.isHorizontalRule(trimmed)) {
        flushParagraph();
        inTable = false;
        tokens.push({
          type: TokenType.HORIZONTAL_RULE,
          line: currentLine,
        } as HorizontalRuleToken);
        currentLine++;
        continue;
      }

      // ==================== HEADING ====================
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        inTable = false;
        const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
        const text = headingMatch[2].trim();
        tokens.push({
          type: TokenType.HEADING,
          level,
          text,
          formatting: this.extractInlineFormatting(text),
          line: currentLine,
        } as HeadingToken);
        currentLine++;
        continue;
      }

      // ==================== BLOCKQUOTE ====================
      if (trimmed.startsWith(">")) {
        flushParagraph();
        inTable = false;
        const text = trimmed.slice(1).trim();
        tokens.push({
          type: TokenType.BLOCKQUOTE,
          text,
          formatting: this.extractInlineFormatting(text),
          line: currentLine,
        } as BlockquoteToken);
        currentLine++;
        continue;
      }

      // ==================== UNORDERED LIST ====================
      const unorderedMatch = trimmed.match(/^([*\-+])\s+(.+)$/);
      if (unorderedMatch) {
        flushParagraph();
        inTable = false;
        const indentLevel = Math.floor(
          (line.length - line.trimStart().length) / 2
        );
        const text = unorderedMatch[2].trim();
        tokens.push({
          type: TokenType.LIST_ITEM,
          ordered: false,
          text,
          level: indentLevel,
          formatting: this.extractInlineFormatting(text),
          line: currentLine,
        } as ListItemToken);
        currentLine++;
        continue;
      }

      // ==================== ORDERED LIST ====================
      const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (orderedMatch) {
        flushParagraph();
        inTable = false;
        const indentLevel = Math.floor(
          (line.length - line.trimStart().length) / 2
        );
        const text = orderedMatch[2].trim();
        tokens.push({
          type: TokenType.LIST_ITEM,
          ordered: true,
          text,
          level: indentLevel,
          formatting: this.extractInlineFormatting(text),
          line: currentLine,
        } as ListItemToken);
        currentLine++;
        continue;
      }

      // ==================== IMAGE (standalone) ====================
      const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        flushParagraph();
        inTable = false;
        tokens.push({
          type: TokenType.IMAGE,
          alt: imageMatch[1],
          url: imageMatch[2],
          line: currentLine,
        } as ImageToken);
        currentLine++;
        continue;
      }

      // ==================== TABLE ====================
      if (trimmed.includes("|")) {
        // Check if next line is a separator (indicates table header)
        const nextLine =
          currentLine + 1 < lines.length ? lines[currentLine + 1].trim() : "";
        const isSeparator = this.isTableSeparator(nextLine);

        if (isSeparator && !inTable) {
          // This is a table header row
          flushParagraph();
          const cells = this.parseTableRow(trimmed);
          tableAlignment = this.parseTableAlignment(nextLine);
          tokens.push({
            type: TokenType.TABLE_ROW,
            cells,
            isHeader: true,
            alignment: tableAlignment,
            line: currentLine,
          } as TableRowToken);
          currentLine += 2; // Skip header and separator
          inTable = true;
          continue;
        } else if (inTable) {
          // Table data row
          const cells = this.parseTableRow(trimmed);
          tokens.push({
            type: TokenType.TABLE_ROW,
            cells,
            isHeader: false,
            alignment: tableAlignment,
            line: currentLine,
          } as TableRowToken);
          currentLine++;
          continue;
        }
      }

      // ==================== PARAGRAPH (default) ====================
      inTable = false;
      if (paragraphLines.length === 0) {
        paragraphStartLine = currentLine;
      }
      paragraphLines.push(line);
      currentLine++;
    }

    // Handle unclosed code block at end of file
    if (inCodeBlock && codeBlockLines.length > 0) {
      tokens.push({
        type: TokenType.CODE_BLOCK,
        language: codeBlockLanguage,
        code: codeBlockLines.join("\n"),
        line: codeBlockStartLine,
      } as CodeBlockToken);
    }

    // Flush any remaining paragraph content
    flushParagraph();

    this.logger.debug(`Parsed ${tokens.length} tokens from markdown`);
    return tokens;
  }

  /**
   * Extract inline formatting (bold, italic, code, links) from text.
   * Handles nested formatting like ***bold italic***.
   * @param text - Text to analyze
   * @returns Array of inline format descriptors
   */
  private extractInlineFormatting(text: string): InlineFormat[] {
    const formats: InlineFormat[] = [];

    // Bold+Italic with *** (must check before bold/italic)
    this.extractPattern(text, /\*\*\*(.+?)\*\*\*/g, "bold", formats);
    this.extractPattern(text, /___(.+?)___/g, "bold", formats);

    // Bold with **
    this.extractPattern(text, /\*\*(.+?)\*\*/g, "bold", formats);

    // Bold with __
    this.extractPattern(text, /__(.+?)__/g, "bold", formats);

    // Italic with * (not preceded/followed by *)
    this.extractPattern(
      text,
      /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
      "italic",
      formats
    );

    // Italic with _ (not preceded/followed by _)
    this.extractPattern(
      text,
      /(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g,
      "italic",
      formats
    );

    // Inline code with `
    this.extractPattern(text, /`([^`]+)`/g, "code", formats);

    // Links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(text)) !== null) {
      formats.push({
        type: "link",
        start: match.index,
        end: match.index + match[0].length,
        url: match[2],
      });
    }

    // Remove duplicate/overlapping formats and sort
    return this.deduplicateFormats(formats);
  }

  /**
   * Helper to extract formatting patterns
   */
  private extractPattern(
    text: string,
    regex: RegExp,
    type: "bold" | "italic" | "code",
    formats: InlineFormat[]
  ): void {
    let match;
    while ((match = regex.exec(text)) !== null) {
      formats.push({
        type,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  /**
   * Remove duplicate and fully overlapping format ranges
   */
  private deduplicateFormats(formats: InlineFormat[]): InlineFormat[] {
    if (formats.length <= 1) return formats;

    // Sort by start position, then by length (longer first)
    formats.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.end - b.start - (a.end - a.start);
    });

    const result: InlineFormat[] = [];
    for (const format of formats) {
      // Check if this format is already covered by an existing one
      const isDuplicate = result.some(
        (existing) =>
          existing.start === format.start &&
          existing.end === format.end &&
          existing.type === format.type
      );
      if (!isDuplicate) {
        result.push(format);
      }
    }
    return result;
  }

  /**
   * Check if line is a horizontal rule (---, ***, ___)
   */
  private isHorizontalRule(line: string): boolean {
    const trimmed = line.trim();
    return (
      /^-{3,}$/.test(trimmed) ||
      /^\*{3,}$/.test(trimmed) ||
      /^_{3,}$/.test(trimmed)
    );
  }

  /**
   * Check if line is a table separator (| --- | --- |)
   */
  private isTableSeparator(line: string): boolean {
    if (!line) return false;
    // Must contain at least one pipe and dash pattern
    return /^\|?[\s]*:?-+:?[\s]*(\|[\s]*:?-+:?[\s]*)+\|?$/.test(line);
  }

  /**
   * Parse table row into cell contents
   */
  private parseTableRow(line: string): string[] {
    let cleaned = line.trim();
    // Remove leading pipe
    if (cleaned.startsWith("|")) {
      cleaned = cleaned.slice(1);
    }
    // Remove trailing pipe
    if (cleaned.endsWith("|")) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned.split("|").map((cell) => cell.trim());
  }

  /**
   * Parse table alignment from separator line
   * :--- = left, :---: = center, ---: = right
   */
  private parseTableAlignment(
    separatorLine: string
  ): ("left" | "center" | "right")[] {
    const cells = this.parseTableRow(separatorLine);
    return cells.map((cell) => {
      const trimmed = cell.trim();
      const hasLeftColon = trimmed.startsWith(":");
      const hasRightColon = trimmed.endsWith(":");

      if (hasLeftColon && hasRightColon) return "center";
      if (hasRightColon) return "right";
      return "left";
    });
  }
}
