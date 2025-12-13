import { Injectable, Logger } from "@nestjs/common";
import PDFDocument from "pdfkit";
import {
  Document,
  Element,
  PDFConfig,
  HeadingElement,
  ParagraphElement,
  ListElement,
  CodeBlockElement,
  TableElement,
  ImageElement,
  BlockquoteElement,
  InlineFormat,
} from "../types/document";
import * as fs from "fs";
import * as path from "path";

/**
 * PDFGeneratorService
 *
 * Renders a document structure to PDF using PDFKit.
 * Handles all element types with proper formatting:
 * - Headings with different sizes
 * - Paragraphs with inline formatting (bold, italic, code, links)
 * - Lists (ordered and unordered)
 * - Code blocks with syntax highlighting background
 * - Tables with borders and alignment
 * - Images (embedded)
 * - Blockquotes
 * - Horizontal rules
 */
@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  private readonly DEFAULT_CONFIG: PDFConfig = {
    pageSize: "A4",
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
    fontSize: 12,
    lineHeight: 1.5,
    showPageNumbers: false,
    pageNumberPosition: "bottom-center",
    headerText: "",
    footerText: "",
  };

  /**
   * Generate PDF from document
   */
  async generate(
    document: Document,
    outputPath: string,
    config?: Partial<PDFConfig>
  ): Promise<void> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    return new Promise((resolve, reject) => {
      try {
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (outputDir && !fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const doc = new PDFDocument({
          size: finalConfig.pageSize,
          margins: finalConfig.margins,
          autoFirstPage: true,
          bufferPages: true,
          pdfVersion: "1.3",
          info: {
            Title: document.metadata?.title || "Document",
            Author: document.metadata?.author || "",
            Subject: document.metadata?.subject || "",
            CreationDate: new Date(),
          },
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Render all elements
        for (const element of document.elements) {
          this.renderElement(doc, element, finalConfig);
        }

        // Add headers, footers, and page numbers
        this.addPageDetails(doc, finalConfig);

        doc.end();

        writeStream.on("finish", () => {
          this.logger.log(`PDF generated successfully: ${outputPath}`);
          resolve();
        });

        writeStream.on("error", reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Render a single element
   */
  private renderElement(
    doc: PDFKit.PDFDocument,
    element: Element,
    config: PDFConfig
  ): void {
    switch (element.type) {
      case "heading":
        this.renderHeading(doc, element as HeadingElement, config);
        break;
      case "paragraph":
        this.renderParagraph(doc, element as ParagraphElement, config);
        break;
      case "list":
        this.renderList(doc, element as ListElement, config);
        break;
      case "code-block":
        this.renderCodeBlock(doc, element as CodeBlockElement, config);
        break;
      case "table":
        this.renderTable(doc, element as TableElement, config);
        break;
      case "image":
        this.renderImage(doc, element as ImageElement, config);
        break;
      case "blockquote":
        this.renderBlockquote(doc, element as BlockquoteElement, config);
        break;
      case "horizontal-rule":
        this.renderHorizontalRule(doc, config);
        break;
    }
  }

  /**
   * Render heading
   */
  private renderHeading(
    doc: PDFKit.PDFDocument,
    element: HeadingElement,
    config: PDFConfig
  ): void {
    const fontSizes = {
      1: 28,
      2: 24,
      3: 20,
      4: 18,
      5: 16,
      6: 14,
    };

    const fontSize = fontSizes[element.level];
    const marginTop = element.level === 1 ? 20 : 15;
    const marginBottom = 10;

    // Add spacing before heading
    if (doc.y > config.margins!.top) {
      doc.moveDown(marginTop / config.fontSize!);
    }

    doc.font("Helvetica-Bold").fontSize(fontSize).fillColor("#000000");

    this.renderTextWithFormatting(doc, element.text, element.formatting);

    doc.moveDown(marginBottom / config.fontSize!);

    // Reset font
    doc.font("Helvetica").fontSize(config.fontSize!);
  }

  /**
   * Render paragraph
   */
  private renderParagraph(
    doc: PDFKit.PDFDocument,
    element: ParagraphElement,
    config: PDFConfig
  ): void {
    doc.font("Helvetica").fontSize(config.fontSize!).fillColor("#000000");

    this.renderTextWithFormatting(doc, element.text, element.formatting);

    doc.moveDown(1);
  }

  /**
   * Render text with inline formatting
   * Uses a simpler approach that doesn't cause text overlap
   */
  private renderTextWithFormatting(
    doc: PDFKit.PDFDocument,
    text: string,
    formatting?: InlineFormat[]
  ): void {
    if (!formatting || formatting.length === 0) {
      doc.text(text);
      return;
    }

    // Sort formatting by start position
    const sorted = [...formatting].sort((a, b) => a.start - b.start);

    // Build segments of text with their formatting
    const segments: Array<{
      text: string;
      bold?: boolean;
      italic?: boolean;
      code?: boolean;
      link?: string;
    }> = [];

    let lastPos = 0;

    for (const format of sorted) {
      // Add plain text before this format
      if (format.start > lastPos) {
        const plainText = text.substring(lastPos, format.start);
        if (plainText) {
          segments.push({ text: plainText });
        }
      }

      // Extract and clean the formatted text
      let formattedText = text.substring(format.start, format.end);

      if (format.type === "bold") {
        // Remove ** or __ markers
        formattedText = formattedText.replace(/^\*\*|\*\*$/g, "");
        formattedText = formattedText.replace(/^__|__$/g, "");
        segments.push({ text: formattedText, bold: true });
      } else if (format.type === "italic") {
        // Remove * or _ markers
        formattedText = formattedText.replace(/^\*|\*$/g, "");
        formattedText = formattedText.replace(/^_|_$/g, "");
        segments.push({ text: formattedText, italic: true });
      } else if (format.type === "code") {
        // Remove ` markers
        formattedText = formattedText.replace(/^`|`$/g, "");
        segments.push({ text: formattedText, code: true });
      } else if (format.type === "link") {
        // Extract link text from [text](url)
        const linkMatch = formattedText.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          segments.push({ text: linkMatch[1], link: linkMatch[2] });
        } else {
          segments.push({ text: formattedText });
        }
      }

      lastPos = format.end;
    }

    // Add remaining plain text
    if (lastPos < text.length) {
      const remaining = text.substring(lastPos);
      if (remaining) {
        segments.push({ text: remaining });
      }
    }

    // Render all segments
    const currentFont = "Helvetica";
    const currentSize = doc.page.width; // Save current state

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;

      // Set appropriate font/color
      if (segment.bold) {
        doc.font("Helvetica-Bold").fillColor("#000000");
      } else if (segment.italic) {
        doc.font("Helvetica-Oblique").fillColor("#000000");
      } else if (segment.code) {
        doc.font("Courier").fillColor("#c7254e");
      } else if (segment.link) {
        doc.font("Helvetica").fillColor("#0066cc");
      } else {
        doc.font("Helvetica").fillColor("#000000");
      }

      // Render the segment
      if (segment.link) {
        doc.text(segment.text, {
          continued: !isLast,
          link: segment.link,
          underline: true,
        });
      } else {
        doc.text(segment.text, { continued: !isLast });
      }
    }

    // If no segments, just output empty line
    if (segments.length === 0) {
      doc.text(text);
    }

    // Reset font
    doc.font("Helvetica").fillColor("#000000");
  }

  /**
   * Render list
   */
  private renderList(
    doc: PDFKit.PDFDocument,
    element: ListElement,
    config: PDFConfig
  ): void {
    const baseIndent = 20;
    let counter = 1;

    for (const item of element.items) {
      const bullet = element.ordered ? `${counter}.` : "•";
      const itemIndent = config.margins!.left + item.level * baseIndent;

      doc.font("Helvetica").fontSize(config.fontSize!).fillColor("#000000");

      // Render bullet/number and text on same conceptual line
      // Calculate bullet width for proper text alignment
      const bulletWidth = doc.widthOfString(bullet + " ");

      doc.text(bullet + " ", itemIndent, doc.y, { continued: true });

      // Render the item text (which may have formatting)
      if (item.formatting && item.formatting.length > 0) {
        this.renderTextWithFormatting(doc, item.text, item.formatting);
      } else {
        doc.text(item.text);
      }

      if (element.ordered) counter++;
    }

    doc.moveDown(0.5);
  }

  /**
   * Render code block
   */
  private renderCodeBlock(
    doc: PDFKit.PDFDocument,
    element: CodeBlockElement,
    config: PDFConfig
  ): void {
    const bgColor = "#f5f5f5";
    const padding = 10;
    const codeWidth =
      doc.page.width -
      config.margins!.left -
      config.margins!.right -
      2 * padding;

    // Calculate height needed
    const lines = element.code.split("\n");
    const lineHeight = config.fontSize! * 1.2;
    const codeHeight = lines.length * lineHeight + 2 * padding;

    // Check if we need a new page
    if (doc.y + codeHeight > doc.page.height - config.margins!.bottom) {
      doc.addPage();
    }

    const startY = doc.y;

    // Draw background
    doc
      .rect(config.margins!.left, startY, codeWidth + 2 * padding, codeHeight)
      .fill(bgColor);

    // Draw code
    doc
      .fillColor("#000000")
      .font("Courier")
      .fontSize(config.fontSize! - 1);

    doc.y = startY + padding;
    doc.x = config.margins!.left + padding;

    doc.text(element.code, {
      width: codeWidth,
      align: "left",
    });

    doc.moveDown(1);

    // Reset font
    doc.font("Helvetica").fontSize(config.fontSize!);
  }

  /**
   * Render table
   */
  private renderTable(
    doc: PDFKit.PDFDocument,
    element: TableElement,
    config: PDFConfig
  ): void {
    const tableWidth =
      doc.page.width - config.margins!.left - config.margins!.right;
    const colCount = element.headers.length || element.rows[0]?.length || 0;
    const minRowHeight = 25;
    const cellPadding = 5;

    // Calculate column widths
    const colWidths = new Array(colCount).fill(0);

    // Measure headers
    doc.font("Helvetica-Bold").fontSize(config.fontSize!);
    element.headers.forEach((header, i) => {
      if (i < colCount) {
        const width = doc.widthOfString(header) + cellPadding * 2;
        colWidths[i] = Math.max(colWidths[i], width);
      }
    });

    // Measure rows
    doc.font("Helvetica").fontSize(config.fontSize!);
    element.rows.forEach((row) => {
      row.forEach((cell, i) => {
        if (i < colCount) {
          const width = doc.widthOfString(cell) + cellPadding * 2;
          colWidths[i] = Math.max(colWidths[i], width);
        }
      });
    });

    // Ensure no column has 0 width (if empty)
    for (let i = 0; i < colCount; i++) {
      if (colWidths[i] === 0) colWidths[i] = 50; // Default min width
    }

    // Scale widths to fit tableWidth
    const totalContentWidth = colWidths.reduce((sum, w) => sum + w, 0);
    const scaleFactor = tableWidth / totalContentWidth;
    const finalColWidths = colWidths.map((w) => w * scaleFactor);

    let startY = doc.y;

    // Helper function to calculate row height based on cell content
    const calculateRowHeight = (cells: string[]): number => {
      let maxHeight = minRowHeight;

      for (let i = 0; i < cells.length; i++) {
        if (i >= colCount) continue;
        const width = finalColWidths[i];
        const textHeight = doc.heightOfString(cells[i], {
          width: width - cellPadding * 2,
          align: "left",
        });
        const requiredHeight = textHeight + cellPadding * 2 + 4;
        maxHeight = Math.max(maxHeight, requiredHeight);
      }

      return maxHeight;
    };

    // Calculate total table height
    let totalTableHeight = 0;
    if (element.headers.length > 0) {
      doc.font("Helvetica-Bold").fontSize(config.fontSize!);
      totalTableHeight += calculateRowHeight(element.headers);
    }

    doc.font("Helvetica").fontSize(config.fontSize!);
    for (const row of element.rows) {
      totalTableHeight += calculateRowHeight(row);
    }

    // Check if table fits on page
    if (startY + totalTableHeight > doc.page.height - config.margins!.bottom) {
      doc.addPage();
      startY = doc.y;
    }

    // Helper to get X position
    const getColX = (index: number) => {
      let x = config.margins!.left;
      for (let i = 0; i < index; i++) {
        x += finalColWidths[i];
      }
      return x;
    };

    // Draw header
    if (element.headers.length > 0) {
      const headerHeight = calculateRowHeight(element.headers);

      for (let i = 0; i < element.headers.length; i++) {
        const x = getColX(i);
        const width = finalColWidths[i];

        // Cell background
        doc.rect(x, startY, width, headerHeight).fill("#f0f0f0");

        // Cell border
        doc.rect(x, startY, width, headerHeight).stroke("#cccccc");

        // Cell text
        doc
          .fillColor("#000000")
          .font("Helvetica-Bold")
          .fontSize(config.fontSize!);

        const alignment = element.alignment?.[i] || "left";

        const currentY = doc.y;

        doc.text(element.headers[i], x + cellPadding, startY + cellPadding, {
          width: width - cellPadding * 2,
          align: alignment,
          lineBreak: true,
          height: headerHeight - cellPadding * 2,
          ellipsis: false,
          continued: false,
        });

        doc.y = currentY;
      }

      startY += headerHeight;
    }

    // Draw rows
    for (const row of element.rows) {
      const rowHeight = calculateRowHeight(row);

      for (let i = 0; i < row.length; i++) {
        const x = getColX(i);
        const width = finalColWidths[i];

        // Cell border
        doc.rect(x, startY, width, rowHeight).stroke("#cccccc");

        // Cell text
        doc.fillColor("#000000").font("Helvetica").fontSize(config.fontSize!);

        const alignment = element.alignment?.[i] || "left";

        const currentY = doc.y;

        doc.text(row[i], x + cellPadding, startY + cellPadding, {
          width: width - cellPadding * 2,
          align: alignment,
          lineBreak: true,
          height: rowHeight - cellPadding * 2,
          ellipsis: false,
          continued: false,
        });

        doc.y = currentY;
      }

      startY += rowHeight;
    }

    // Update Y position to after the table
    doc.y = startY;

    // Move cursor to a new position and reset x to left margin
    doc.x = config.margins!.left;
    doc.moveDown(1);
  }

  /**
   * Render image
   */
  private renderImage(
    doc: PDFKit.PDFDocument,
    element: ImageElement,
    config: PDFConfig
  ): void {
    if (!element.data) {
      this.logger.warn(`Image data not available for ${element.url}`);
      doc.text(`[Image: ${element.alt}]`, { align: "center" });
      doc.moveDown(1);
      return;
    }

    try {
      const maxWidth =
        doc.page.width - config.margins!.left - config.margins!.right;
      const maxHeight = 300;

      doc.image(element.data, {
        fit: [maxWidth, maxHeight],
        align: "center",
      });

      if (element.alt) {
        doc
          .fontSize(10)
          .fillColor("#666666")
          .text(element.alt, { align: "center" });
      }

      doc.moveDown(1);
      doc.fontSize(config.fontSize!).fillColor("#000000");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to render image: ${errorMessage}`);
      doc.text(`[Image: ${element.alt}]`, { align: "center" });
      doc.moveDown(1);
    }
  }

  /**
   * Render blockquote
   */
  private renderBlockquote(
    doc: PDFKit.PDFDocument,
    element: BlockquoteElement,
    config: PDFConfig
  ): void {
    const indent = 20;
    const borderWidth = 3;

    const startY = doc.y;
    const startX = config.margins!.left + indent;

    // Draw left border
    doc
      .moveTo(startX - 10, startY)
      .lineTo(startX - 10, doc.y + 20)
      .lineWidth(borderWidth)
      .stroke("#cccccc");

    // Draw text
    doc.x = startX;
    doc
      .font("Helvetica-Oblique")
      .fontSize(config.fontSize!)
      .fillColor("#666666");

    this.renderTextWithFormatting(doc, element.text, element.formatting);

    doc.moveDown(1);

    // Reset
    doc.font("Helvetica").fillColor("#000000");
  }

  /**
   * Render horizontal rule
   */
  private renderHorizontalRule(
    doc: PDFKit.PDFDocument,
    config: PDFConfig
  ): void {
    const width = doc.page.width - config.margins!.left - config.margins!.right;

    doc.moveDown(0.5);

    doc
      .moveTo(config.margins!.left, doc.y)
      .lineTo(config.margins!.left + width, doc.y)
      .lineWidth(1)
      .stroke("#cccccc");

    doc.moveDown(0.5);
  }

  /**
   * Add headers, footers, and page numbers to all pages
   */
  private addPageDetails(doc: PDFKit.PDFDocument, config: PDFConfig): void {
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Save current margins and set to 0 to allow writing in header/footer
      const oldMargins = { ...doc.page.margins };
      doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

      // Add Header
      if (config.headerText) {
        doc
          .fontSize(10)
          .fillColor("#666666")
          .text(
            config.headerText,
            config.margins!.left,
            config.margins!.top / 2,
            {
              align: "center",
              width:
                doc.page.width - config.margins!.left - config.margins!.right,
              lineBreak: false,
            }
          );
      }

      // Add Footer
      if (config.footerText) {
        doc
          .fontSize(10)
          .fillColor("#666666")
          .text(
            config.footerText,
            config.margins!.left,
            doc.page.height - config.margins!.bottom / 2,
            {
              align: "center",
              width:
                doc.page.width - config.margins!.left - config.margins!.right,
              lineBreak: false,
            }
          );
      }

      // Add Page Numbers
      if (config.showPageNumbers) {
        const pageText = `${i + 1} / ${totalPages}`;
        let align: "center" | "right" | "left" = "center";

        if (config.pageNumberPosition === "bottom-right") align = "right";
        else if (config.pageNumberPosition === "bottom-left") align = "left";

        doc
          .fontSize(10)
          .fillColor("#666666")
          .text(
            pageText,
            config.margins!.left,
            doc.page.height - config.margins!.bottom / 2,
            {
              align,
              width:
                doc.page.width - config.margins!.left - config.margins!.right,
              lineBreak: false,
            }
          );
      }

      // Restore margins
      doc.page.margins = oldMargins;
    }
  }
}
