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

class ParserState {
  tokens: Token[] = [];
  currentLineIndex = 0;
  paragraphLines: string[] = [];
  paragraphStartLine = 0;

  constructor(public readonly lines: string[]) {}

  get currentLine(): string {
    return this.lines[this.currentLineIndex];
  }

  get nextLine(): string | undefined {
    return this.lines[this.currentLineIndex + 1];
  }

  get hasMoreLines(): boolean {
    return this.currentLineIndex < this.lines.length;
  }

  advance(count = 1) {
    this.currentLineIndex += count;
  }

  addToken(token: Token) {
    this.tokens.push(token);
  }

  addToParagraph(line: string) {
    if (this.paragraphLines.length === 0) {
      this.paragraphStartLine = this.currentLineIndex;
    }
    this.paragraphLines.push(line);
  }

  flushParagraph(extractFormatting: (text: string) => InlineFormat[]) {
    if (this.paragraphLines.length > 0) {
      const text = this.paragraphLines.join("\n").trim();
      if (text) {
        this.tokens.push({
          type: TokenType.PARAGRAPH,
          text,
          formatting: extractFormatting(text),
          line: this.paragraphStartLine,
        } as ParagraphToken);
      }
      this.paragraphLines = [];
    }
  }
}

@Injectable()
export class MarkdownParserService {
  private readonly logger = new Logger(MarkdownParserService.name);

  parse(markdown: string): Token[] {
    if (!markdown || !markdown.trim()) {
      this.logger.debug("Empty markdown input received");
      return [];
    }

    const lines = markdown.split("\n");
    const state = new ParserState(lines);

    while (state.hasMoreLines) {
      const line = state.currentLine;
      const trimmed = line.trim();

      if (this.tryParseCodeBlock(state, trimmed)) continue;

      if (!trimmed) {
        state.flushParagraph(this.extractInlineFormatting.bind(this));
        state.advance();
        continue;
      }

      if (this.tryParseHorizontalRule(state, trimmed)) continue;
      if (this.tryParseHeading(state, trimmed)) continue;
      if (this.tryParseBlockquote(state, trimmed)) continue;
      if (this.tryParseList(state, trimmed, line)) continue;
      if (this.tryParseImage(state, trimmed)) continue;
      if (this.tryParseTable(state, trimmed)) continue;

      state.addToParagraph(line);
      state.advance();
    }

    state.flushParagraph(this.extractInlineFormatting.bind(this));

    this.logger.debug(`Parsed ${state.tokens.length} tokens from markdown`);
    return state.tokens;
  }

  private tryParseCodeBlock(state: ParserState, trimmed: string): boolean {
    if (!trimmed.startsWith("```")) return false;

    state.flushParagraph(this.extractInlineFormatting.bind(this));

    const language = trimmed.slice(3).trim() || null;
    const startLine = state.currentLineIndex;
    const codeLines: string[] = [];

    state.advance();

    while (state.hasMoreLines) {
      const line = state.currentLine;
      if (line.trim().startsWith("```")) {
        state.addToken({
          type: TokenType.CODE_BLOCK,
          language,
          code: codeLines.join("\n"),
          line: startLine,
        } as CodeBlockToken);
        state.advance();
        return true;
      }
      codeLines.push(line);
      state.advance();
    }

    state.addToken({
      type: TokenType.CODE_BLOCK,
      language,
      code: codeLines.join("\n"),
      line: startLine,
    } as CodeBlockToken);

    return true;
  }

  private tryParseHorizontalRule(state: ParserState, trimmed: string): boolean {
    if (!this.isHorizontalRule(trimmed)) return false;

    state.flushParagraph(this.extractInlineFormatting.bind(this));
    state.addToken({
      type: TokenType.HORIZONTAL_RULE,
      line: state.currentLineIndex,
    } as HorizontalRuleToken);
    state.advance();
    return true;
  }

  private tryParseHeading(state: ParserState, trimmed: string): boolean {
    const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (!match) return false;

    state.flushParagraph(this.extractInlineFormatting.bind(this));
    const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
    const text = match[2].trim();

    state.addToken({
      type: TokenType.HEADING,
      level,
      text,
      formatting: this.extractInlineFormatting(text),
      line: state.currentLineIndex,
    } as HeadingToken);
    state.advance();
    return true;
  }

  private tryParseBlockquote(state: ParserState, trimmed: string): boolean {
    if (!trimmed.startsWith(">")) return false;

    state.flushParagraph(this.extractInlineFormatting.bind(this));
    const text = trimmed.slice(1).trim();

    state.addToken({
      type: TokenType.BLOCKQUOTE,
      text,
      formatting: this.extractInlineFormatting(text),
      line: state.currentLineIndex,
    } as BlockquoteToken);
    state.advance();
    return true;
  }

  private tryParseList(
    state: ParserState,
    trimmed: string,
    originalLine: string
  ): boolean {
    const unorderedMatch = trimmed.match(/^([*\-+])\s+(.+)$/);
    if (unorderedMatch) {
      state.flushParagraph(this.extractInlineFormatting.bind(this));
      const indentLevel = Math.floor(
        (originalLine.length - originalLine.trimStart().length) / 2
      );
      const text = unorderedMatch[2].trim();

      state.addToken({
        type: TokenType.LIST_ITEM,
        ordered: false,
        text,
        level: indentLevel,
        formatting: this.extractInlineFormatting(text),
        line: state.currentLineIndex,
      } as ListItemToken);
      state.advance();
      return true;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      state.flushParagraph(this.extractInlineFormatting.bind(this));
      const indentLevel = Math.floor(
        (originalLine.length - originalLine.trimStart().length) / 2
      );
      const text = orderedMatch[2].trim();

      state.addToken({
        type: TokenType.LIST_ITEM,
        ordered: true,
        text,
        level: indentLevel,
        formatting: this.extractInlineFormatting(text),
        line: state.currentLineIndex,
      } as ListItemToken);
      state.advance();
      return true;
    }

    return false;
  }

  private tryParseImage(state: ParserState, trimmed: string): boolean {
    const match = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (!match) return false;

    state.flushParagraph(this.extractInlineFormatting.bind(this));
    state.addToken({
      type: TokenType.IMAGE,
      alt: match[1],
      url: match[2],
      line: state.currentLineIndex,
    } as ImageToken);
    state.advance();
    return true;
  }

  private tryParseTable(state: ParserState, trimmed: string): boolean {
    if (!trimmed.includes("|")) return false;

    const nextLine = state.nextLine?.trim() || "";
    const isSeparator = this.isTableSeparator(nextLine);

    if (isSeparator) {
      state.flushParagraph(this.extractInlineFormatting.bind(this));

      const cells = this.parseTableRow(trimmed);
      const alignment = this.parseTableAlignment(nextLine);

      state.addToken({
        type: TokenType.TABLE_ROW,
        cells,
        isHeader: true,
        alignment,
        line: state.currentLineIndex,
      } as TableRowToken);

      state.advance(2);

      while (state.hasMoreLines) {
        const line = state.currentLine.trim();
        if (!line.includes("|") || this.isTableSeparator(line)) break;

        const rowCells = this.parseTableRow(line);
        state.addToken({
          type: TokenType.TABLE_ROW,
          cells: rowCells,
          isHeader: false,
          alignment,
          line: state.currentLineIndex,
        } as TableRowToken);
        state.advance();
      }
      return true;
    }

    return false;
  }

  private extractInlineFormatting(text: string): InlineFormat[] {
    const formats: InlineFormat[] = [];

    this.extractPattern(text, /\*\*\*(.+?)\*\*\*/g, "bold", formats);
    this.extractPattern(text, /___(.+?)___/g, "bold", formats);

    this.extractPattern(text, /\*\*(.+?)\*\*/g, "bold", formats);

    this.extractPattern(text, /__(.+?)__/g, "bold", formats);

    this.extractPattern(
      text,
      /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
      "italic",
      formats
    );

    this.extractPattern(
      text,
      /(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g,
      "italic",
      formats
    );

    this.extractPattern(text, /`([^`]+)`/g, "code", formats);

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

    return this.deduplicateFormats(formats);
  }

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

  private deduplicateFormats(formats: InlineFormat[]): InlineFormat[] {
    if (formats.length <= 1) return formats;

    formats.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.end - b.start - (a.end - a.start);
    });

    const result: InlineFormat[] = [];
    for (const format of formats) {
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

  private isHorizontalRule(line: string): boolean {
    const trimmed = line.trim();
    return (
      /^-{3,}$/.test(trimmed) ||
      /^\*{3,}$/.test(trimmed) ||
      /^_{3,}$/.test(trimmed)
    );
  }

  private isTableSeparator(line: string): boolean {
    if (!line) return false;
    return /^\|?[\s]*:?-+:?[\s]*(\|[\s]*:?-+:?[\s]*)+\|?$/.test(line);
  }

  private parseTableRow(line: string): string[] {
    let cleaned = line.trim();
    if (cleaned.startsWith("|")) {
      cleaned = cleaned.slice(1);
    }

    if (cleaned.endsWith("|")) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned.split("|").map((cell) => cell.trim());
  }

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
