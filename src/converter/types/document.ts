/**
 * Document structure types for PDF generation
 */

export interface DocumentElement {
  type: string;
  id?: string;
}

export interface HeadingElement extends DocumentElement {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  id: string;
  formatting?: InlineFormat[];
}

export interface ParagraphElement extends DocumentElement {
  type: "paragraph";
  text: string;
  formatting?: InlineFormat[];
}

export interface ListElement extends DocumentElement {
  type: "list";
  ordered: boolean;
  items: ListItemElement[];
}

export interface ListItemElement {
  text: string;
  level: number;
  formatting?: InlineFormat[];
}

export interface CodeBlockElement extends DocumentElement {
  type: "code-block";
  language: string | null;
  code: string;
}

export interface TableElement extends DocumentElement {
  type: "table";
  headers: string[];
  rows: string[][];
  alignment?: ("left" | "center" | "right")[];
}

export interface ImageElement extends DocumentElement {
  type: "image";
  alt: string;
  url: string;
  data?: Buffer; // Downloaded image data
}

export interface BlockquoteElement extends DocumentElement {
  type: "blockquote";
  text: string;
  formatting?: InlineFormat[];
}

export interface HorizontalRuleElement extends DocumentElement {
  type: "horizontal-rule";
}

export interface InlineFormat {
  type: "bold" | "italic" | "code" | "link";
  start: number;
  end: number;
  url?: string;
}

export type Element =
  | HeadingElement
  | ParagraphElement
  | ListElement
  | CodeBlockElement
  | TableElement
  | ImageElement
  | BlockquoteElement
  | HorizontalRuleElement;

export interface Document {
  elements: Element[];
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

export interface PDFConfig {
  pageSize?: "A4" | "Letter";
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  fontSize?: number;
  lineHeight?: number;
}
