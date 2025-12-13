import { Injectable, Logger } from "@nestjs/common";
import {
  Token,
  TokenType,
  ListItemToken,
  HeadingToken,
  ParagraphToken,
  CodeBlockToken,
  TableRowToken,
  ImageToken,
  BlockquoteToken,
} from "../types/tokens";
import {
  Document,
  Element,
  HeadingElement,
  ParagraphElement,
  ListElement,
  CodeBlockElement,
  TableElement,
  ImageElement,
  BlockquoteElement,
  HorizontalRuleElement,
  ListItemElement,
} from "../types/document";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class DocumentConverterService {
  private readonly logger = new Logger(DocumentConverterService.name);

  async convert(tokens: Token[], baseDir?: string): Promise<Document> {
    if (!tokens || tokens.length === 0) {
      this.logger.debug("No tokens to convert");
      return {
        elements: [],
        metadata: { title: "Document" },
      };
    }

    const elements: Element[] = [];
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];

      switch (token.type) {
        case TokenType.HEADING:
          elements.push(this.convertHeading(token as HeadingToken));
          i++;
          break;

        case TokenType.PARAGRAPH:
          elements.push(this.convertParagraph(token as ParagraphToken));
          i++;
          break;

        case TokenType.LIST_ITEM: {
          const listItems: ListItemToken[] = [];
          const ordered = (token as ListItemToken).ordered;
          while (i < tokens.length && tokens[i].type === TokenType.LIST_ITEM) {
            listItems.push(tokens[i] as ListItemToken);
            i++;
          }
          elements.push(this.convertList(listItems, ordered));
          break;
        }

        case TokenType.CODE_BLOCK:
          elements.push(this.convertCodeBlock(token as CodeBlockToken));
          i++;
          break;

        case TokenType.TABLE_ROW: {
          const tableRows: TableRowToken[] = [];
          while (i < tokens.length && tokens[i].type === TokenType.TABLE_ROW) {
            tableRows.push(tokens[i] as TableRowToken);
            i++;
          }
          elements.push(this.convertTable(tableRows));
          break;
        }

        case TokenType.IMAGE: {
          const imageElement = await this.convertImage(
            token as ImageToken,
            baseDir
          );
          elements.push(imageElement);
          i++;
          break;
        }

        case TokenType.BLOCKQUOTE:
          elements.push(this.convertBlockquote(token as BlockquoteToken));
          i++;
          break;

        case TokenType.HORIZONTAL_RULE:
          elements.push(this.convertHorizontalRule());
          i++;
          break;

        default:
          this.logger.warn(`Unknown token type: ${(token as Token).type}`);
          i++;
      }
    }

    this.logger.debug(
      `Converted ${tokens.length} tokens to ${elements.length} elements`
    );

    return {
      elements,
      metadata: this.extractMetadata(elements),
    };
  }

  private convertHeading(token: HeadingToken): HeadingElement {
    return {
      type: "heading",
      level: token.level,
      text: token.text,
      id: this.generateId(token.text),
      formatting: token.formatting,
    };
  }

  private convertParagraph(token: ParagraphToken): ParagraphElement {
    return {
      type: "paragraph",
      text: token.text,
      formatting: token.formatting,
    };
  }

  private convertList(tokens: ListItemToken[], ordered: boolean): ListElement {
    const items: ListItemElement[] = tokens.map((token) => ({
      text: token.text,
      level: token.level,
      formatting: token.formatting,
    }));

    return {
      type: "list",
      ordered,
      items,
    };
  }

  private convertCodeBlock(token: CodeBlockToken): CodeBlockElement {
    return {
      type: "code-block",
      language: token.language,
      code: token.code,
    };
  }

  private convertTable(tokens: TableRowToken[]): TableElement {
    const headerRow = tokens.find((t) => t.isHeader);
    const dataRows = tokens.filter((t) => !t.isHeader);

    return {
      type: "table",
      headers: headerRow ? headerRow.cells : [],
      rows: dataRows.map((row) => row.cells),
      alignment: headerRow?.alignment,
    };
  }

  private async convertImage(
    token: ImageToken,
    baseDir?: string
  ): Promise<ImageElement> {
    let imageData: Buffer | undefined;

    try {
      if (token.url.startsWith("http://") || token.url.startsWith("https://")) {
        this.logger.debug(`Downloading image from ${token.url}`);
        const response = await axios.get(token.url, {
          responseType: "arraybuffer",
          timeout: 10000,
        });
        imageData = Buffer.from(response.data);
      } else if (baseDir) {
        const imagePath = path.resolve(baseDir, token.url);
        if (fs.existsSync(imagePath)) {
          imageData = fs.readFileSync(imagePath);
        } else {
          this.logger.warn(`Image file not found: ${imagePath}`);
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to load image ${token.url}: ${errorMessage}`);
    }

    return {
      type: "image",
      alt: token.alt,
      url: token.url,
      data: imageData,
    };
  }

  private convertBlockquote(token: BlockquoteToken): BlockquoteElement {
    return {
      type: "blockquote",
      text: token.text,
      formatting: token.formatting,
    };
  }

  private convertHorizontalRule(): HorizontalRuleElement {
    return {
      type: "horizontal-rule",
    };
  }

  private generateId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private extractMetadata(elements: Element[]): any {
    const firstHeading = elements.find(
      (el) => el.type === "heading"
    ) as HeadingElement;

    return {
      title: firstHeading?.text || "Document",
    };
  }
}
