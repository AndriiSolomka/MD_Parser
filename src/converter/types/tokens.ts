export enum TokenType {
  HEADING = "HEADING",
  PARAGRAPH = "PARAGRAPH",
  LIST_ITEM = "LIST_ITEM",
  CODE_BLOCK = "CODE_BLOCK",
  TABLE_ROW = "TABLE_ROW",
  IMAGE = "IMAGE",
  BLOCKQUOTE = "BLOCKQUOTE",
  HORIZONTAL_RULE = "HORIZONTAL_RULE",
  LINK = "LINK",
}

export interface InlineFormat {
  type: "bold" | "italic" | "bold-italic" | "code" | "link";
  start: number;
  end: number;
  url?: string;
}

export interface BaseToken {
  type: TokenType;
  line?: number;
}

export interface HeadingToken extends BaseToken {
  type: TokenType.HEADING;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  formatting?: InlineFormat[];
}

export interface ParagraphToken extends BaseToken {
  type: TokenType.PARAGRAPH;
  text: string;
  formatting?: InlineFormat[];
}

export interface ListItemToken extends BaseToken {
  type: TokenType.LIST_ITEM;
  ordered: boolean;
  text: string;
  level: number;
  formatting?: InlineFormat[];
}

export interface CodeBlockToken extends BaseToken {
  type: TokenType.CODE_BLOCK;
  language: string | null;
  code: string;
}

export interface TableRowToken extends BaseToken {
  type: TokenType.TABLE_ROW;
  cells: string[];
  isHeader: boolean;
  alignment?: ("left" | "center" | "right")[];
}

export interface ImageToken extends BaseToken {
  type: TokenType.IMAGE;
  alt: string;
  url: string;
}

export interface BlockquoteToken extends BaseToken {
  type: TokenType.BLOCKQUOTE;
  text: string;
  formatting?: InlineFormat[];
}

export interface HorizontalRuleToken extends BaseToken {
  type: TokenType.HORIZONTAL_RULE;
}

export type Token =
  | HeadingToken
  | ParagraphToken
  | ListItemToken
  | CodeBlockToken
  | TableRowToken
  | ImageToken
  | BlockquoteToken
  | HorizontalRuleToken;
