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

  async generate(
    document: Document,
    outputPath: string,
    config?: Partial<PDFConfig>
  ): Promise<void> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    return new Promise((resolve, reject) => {
      try {
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

        for (const element of document.elements) {
          this.renderElement(doc, element, finalConfig);
        }

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

    if (doc.y > config.margins!.top) {
      doc.moveDown(marginTop / config.fontSize!);
    }

    doc.font("Helvetica-Bold").fontSize(fontSize).fillColor("#000000");

    this.renderTextWithFormatting(doc, element.text, element.formatting);

    doc.moveDown(marginBottom / config.fontSize!);

    doc.font("Helvetica").fontSize(config.fontSize!);
  }

  private renderParagraph(
    doc: PDFKit.PDFDocument,
    element: ParagraphElement,
    config: PDFConfig
  ): void {
    doc.font("Helvetica").fontSize(config.fontSize!).fillColor("#000000");

    this.renderTextWithFormatting(doc, element.text, element.formatting);

    doc.moveDown(1);
  }

  private renderTextWithFormatting(
    doc: PDFKit.PDFDocument,
    text: string,
    formatting?: InlineFormat[]
  ): void {
    if (!formatting || formatting.length === 0) {
      doc.text(text);
      return;
    }

    const hiddenRanges = this.calculateHiddenRanges(text, formatting);
    const sortedPoints = this.calculateSplitPoints(
      text.length,
      formatting,
      hiddenRanges
    );

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i];
      const end = sortedPoints[i + 1];
      if (start >= end) continue;

      if (this.isHidden(start, end, hiddenRanges)) continue;

      const segmentText = text.substring(start, end);
      const activeFormats = formatting.filter(
        (f) => f.start <= start && f.end >= end
      );
      const styles = this.resolveStyles(activeFormats);

      this.applyStyles(doc, styles);

      const isLastSegment = i === sortedPoints.length - 2;

      doc.text(segmentText, {
        continued: !isLastSegment,
        link: styles.link || null,
        underline: !!styles.link,
      });

      if (!isLastSegment && styles.link) {
        this.handleLinkBleeding(
          doc,
          text,
          sortedPoints,
          i,
          formatting,
          styles.link
        );
      }
    }

    doc.font("Helvetica").fillColor("#000000").text(" ", { continued: false });
  }

  private calculateHiddenRanges(
    text: string,
    formatting: InlineFormat[]
  ): { start: number; end: number }[] {
    const hiddenRanges: { start: number; end: number }[] = [];

    formatting.forEach((f) => {
      const sub = text.substring(f.start, f.end);
      if (f.type === "bold-italic") {
        this.addHiddenRangesForEmphasis(hiddenRanges, f, sub, "***", "___", 3);
      } else if (f.type === "bold") {
        this.addHiddenRangesForEmphasis(hiddenRanges, f, sub, "**", "__", 2);
      } else if (f.type === "italic") {
        this.addHiddenRangesForEmphasis(hiddenRanges, f, sub, "*", "_", 1);
      } else if (f.type === "code") {
        if (sub.startsWith("`")) {
          hiddenRanges.push({ start: f.start, end: f.start + 1 });
          hiddenRanges.push({ start: f.end - 1, end: f.end });
        }
      } else if (f.type === "link") {
        const match = sub.match(/^\[(.*)\]\((.*)\)$/);
        if (match) {
          const textLen = match[1].length;
          hiddenRanges.push({ start: f.start, end: f.start + 1 });
          hiddenRanges.push({ start: f.start + 1 + textLen, end: f.end });
        }
      }
    });

    formatting.forEach((f1) => {
      if (f1.type === "bold") {
        const f2 = formatting.find(
          (f) => f.type === "italic" && f.start === f1.start && f.end === f1.end
        );
        if (f2) {
          const sub = text.substring(f1.start, f1.end);
          this.addHiddenRangesForEmphasis(
            hiddenRanges,
            f1,
            sub,
            "***",
            "___",
            3
          );
        }
      }
    });

    return hiddenRanges;
  }

  private addHiddenRangesForEmphasis(
    hiddenRanges: { start: number; end: number }[],
    f: InlineFormat,
    sub: string,
    marker1: string,
    marker2: string,
    length: number
  ) {
    if (sub.startsWith(marker1)) {
      hiddenRanges.push({ start: f.start, end: f.start + length });
      hiddenRanges.push({ start: f.end - length, end: f.end });
    } else if (sub.startsWith(marker2)) {
      hiddenRanges.push({ start: f.start, end: f.start + length });
      hiddenRanges.push({ start: f.end - length, end: f.end });
    }
  }

  private calculateSplitPoints(
    textLength: number,
    formatting: InlineFormat[],
    hiddenRanges: { start: number; end: number }[]
  ): number[] {
    const points = new Set<number>([0, textLength]);
    formatting.forEach((f) => {
      points.add(f.start);
      points.add(f.end);
    });
    hiddenRanges.forEach((r) => {
      points.add(r.start);
      points.add(r.end);
    });
    return Array.from(points).sort((a, b) => a - b);
  }

  private isHidden(
    start: number,
    end: number,
    hiddenRanges: { start: number; end: number }[]
  ): boolean {
    return hiddenRanges.some((r) => start >= r.start && end <= r.end);
  }

  private resolveStyles(activeFormats: InlineFormat[]) {
    return {
      bold: activeFormats.some(
        (f) => f.type === "bold" || f.type === "bold-italic"
      ),
      italic: activeFormats.some(
        (f) => f.type === "italic" || f.type === "bold-italic"
      ),
      code: activeFormats.some((f) => f.type === "code"),
      link: activeFormats.find((f) => f.type === "link")?.url,
    };
  }

  private handleLinkBleeding(
    doc: PDFKit.PDFDocument,
    text: string,
    sortedPoints: number[],
    currentIndex: number,
    formatting: InlineFormat[],
    currentLink: string
  ) {
    const nextStart = sortedPoints[currentIndex + 1];
    const nextEnd = sortedPoints[currentIndex + 2];

    if (nextStart < text.length && nextEnd <= text.length) {
      const nextActiveFormats = formatting.filter(
        (f) => f.start <= nextStart && f.end >= nextEnd
      );
      const hasNextLink = nextActiveFormats.some((f) => f.type === "link");

      if (!hasNextLink) {
        doc.text("", { continued: true, link: null });
      }
    }
  }

  private applyStyles(
    doc: PDFKit.PDFDocument,
    styles: {
      bold?: boolean;
      italic?: boolean;
      code?: boolean;
      link?: string;
    }
  ): void {
    if (styles.bold && styles.italic) {
      doc.font("Helvetica-BoldOblique").fillColor("#000000");
    } else if (styles.bold) {
      doc.font("Helvetica-Bold").fillColor("#000000");
    } else if (styles.italic) {
      doc.font("Helvetica-Oblique").fillColor("#000000");
    } else if (styles.code) {
      doc.font("Courier").fillColor("#c7254e");
    } else if (styles.link) {
      doc.font("Helvetica").fillColor("#0066cc");
    } else {
      doc.font("Helvetica").fillColor("#000000");
    }
  }

  private renderList(
    doc: PDFKit.PDFDocument,
    element: ListElement,
    config: PDFConfig
  ): void {
    const baseIndent = 20;
    const counters = new Map<number, number>();

    for (const item of element.items) {
      const level = item.level;
      if (!counters.has(level)) counters.set(level, 1);

      for (const k of counters.keys()) {
        if (k > level) counters.delete(k);
      }

      const counter = counters.get(level)!;
      const bullet = element.ordered ? `${counter}.` : "•";
      if (element.ordered) counters.set(level, counter + 1);

      const itemIndent = config.margins!.left + item.level * baseIndent;

      doc.font("Helvetica").fontSize(config.fontSize!).fillColor("#000000");

      doc.text(bullet + " ", itemIndent, doc.y, { continued: true });

      if (item.formatting && item.formatting.length > 0) {
        this.renderTextWithFormatting(doc, item.text, item.formatting);
      } else {
        doc.text(item.text);
      }
    }

    doc.moveDown(0.5);
  }

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

    const sanitizedCode = element.code
      .replace(/├──/g, "|--")
      .replace(/└──/g, "`--")
      .replace(/│/g, "|")
      .replace(/└/g, "`")
      .replace(/├/g, "|")
      .replace(/─/g, "-");

    const lines = sanitizedCode.split("\n");
    const lineHeight = config.fontSize! * 1.2;
    const codeHeight = lines.length * lineHeight + 2 * padding;

    if (doc.y + codeHeight > doc.page.height - config.margins!.bottom) {
      doc.addPage();
    }

    const startY = doc.y;

    doc
      .rect(config.margins!.left, startY, codeWidth + 2 * padding, codeHeight)
      .fill(bgColor);

    doc
      .fillColor("#000000")
      .font("Courier")
      .fontSize(config.fontSize! - 1);

    doc.y = startY + padding;
    doc.x = config.margins!.left + padding;

    doc.text(sanitizedCode, {
      width: codeWidth,
      align: "left",
    });

    doc.moveDown(1);

    doc.font("Helvetica").fontSize(config.fontSize!);
  }

  private renderTable(
    doc: PDFKit.PDFDocument,
    element: TableElement,
    config: PDFConfig
  ): void {
    const tableWidth =
      doc.page.width - config.margins!.left - config.margins!.right;
    const colCount = element.headers.length || element.rows[0]?.length || 0;
    const cellPadding = 5;

    const finalColWidths = this.calculateColumnWidths(
      doc,
      element,
      config,
      colCount,
      tableWidth,
      cellPadding
    );

    if (config.onTableLayout) {
      const totalWidth = finalColWidths.reduce((sum, width) => sum + width, 0);
      config.onTableLayout({
        pageWidth: doc.page.width,
        availableWidth: tableWidth,
        totalWidth,
        margins: config.margins!,
        columnWidths: [...finalColWidths],
        headersCount: element.headers.length,
      });
    }

    let startY = doc.y;

    let totalTableHeight = 0;
    if (element.headers.length > 0) {
      doc.font("Helvetica-Bold").fontSize(config.fontSize!);
      totalTableHeight += this.calculateRowHeight(
        doc,
        element.headers,
        finalColWidths,
        colCount,
        cellPadding
      );
    }

    doc.font("Helvetica").fontSize(config.fontSize!);
    for (const row of element.rows) {
      totalTableHeight += this.calculateRowHeight(
        doc,
        row,
        finalColWidths,
        colCount,
        cellPadding
      );
    }

    if (startY + totalTableHeight > doc.page.height - config.margins!.bottom) {
      doc.addPage();
      startY = doc.y;
    }

    if (element.headers.length > 0) {
      startY = this.renderTableRow(
        doc,
        element.headers,
        finalColWidths,
        startY,
        config,
        cellPadding,
        true,
        element.alignment
      );
    }

    for (const row of element.rows) {
      startY = this.renderTableRow(
        doc,
        row,
        finalColWidths,
        startY,
        config,
        cellPadding,
        false,
        element.alignment
      );
    }

    doc.y = startY;
    doc.x = config.margins!.left;
    doc.moveDown(1);
  }

  private calculateColumnWidths(
    doc: PDFKit.PDFDocument,
    element: TableElement,
    config: PDFConfig,
    colCount: number,
    tableWidth: number,
    cellPadding: number
  ): number[] {
    const colWidths = new Array(colCount).fill(0);

    doc.font("Helvetica-Bold").fontSize(config.fontSize!);
    element.headers.forEach((header, i) => {
      if (i < colCount) {
        const width = doc.widthOfString(header) + cellPadding * 2;
        colWidths[i] = Math.max(colWidths[i], width);
      }
    });

    doc.font("Helvetica").fontSize(config.fontSize!);
    element.rows.forEach((row) => {
      row.forEach((cell, i) => {
        if (i < colCount) {
          const width = doc.widthOfString(cell) + cellPadding * 2;
          colWidths[i] = Math.max(colWidths[i], width);
        }
      });
    });

    for (let i = 0; i < colCount; i++) {
      if (colWidths[i] === 0) colWidths[i] = 50;
    }

    const totalContentWidth = colWidths.reduce((sum, w) => sum + w, 0);
    const scaleFactor = tableWidth / totalContentWidth;
    return colWidths.map((w) => w * scaleFactor);
  }

  private calculateRowHeight(
    doc: PDFKit.PDFDocument,
    cells: string[],
    colWidths: number[],
    colCount: number,
    cellPadding: number
  ): number {
    const minRowHeight = 25;
    let maxHeight = minRowHeight;

    for (let i = 0; i < cells.length; i++) {
      if (i >= colCount) continue;
      const width = colWidths[i];
      const textHeight = doc.heightOfString(cells[i], {
        width: width - cellPadding * 2,
        align: "left",
      });
      const requiredHeight = textHeight + cellPadding * 2 + 4;
      maxHeight = Math.max(maxHeight, requiredHeight);
    }

    return maxHeight;
  }

  private renderTableRow(
    doc: PDFKit.PDFDocument,
    cells: string[],
    colWidths: number[],
    startY: number,
    config: PDFConfig,
    cellPadding: number,
    isHeader: boolean,
    alignment?: ("left" | "center" | "right")[]
  ): number {
    const colCount = colWidths.length;

    if (isHeader) {
      doc.font("Helvetica-Bold").fontSize(config.fontSize!);
    } else {
      doc.font("Helvetica").fontSize(config.fontSize!);
    }

    const rowHeight = this.calculateRowHeight(
      doc,
      cells,
      colWidths,
      colCount,
      cellPadding
    );

    const getColX = (index: number) => {
      let x = config.margins!.left;
      for (let i = 0; i < index; i++) {
        x += colWidths[i];
      }
      return x;
    };

    for (let i = 0; i < cells.length; i++) {
      if (i >= colCount) break;

      const x = getColX(i);
      const width = colWidths[i];

      if (isHeader) {
        doc.rect(x, startY, width, rowHeight).fill("#f0f0f0");
        doc.rect(x, startY, width, rowHeight).stroke("#cccccc");
        doc
          .fillColor("#000000")
          .font("Helvetica-Bold")
          .fontSize(config.fontSize!);
      } else {
        doc.rect(x, startY, width, rowHeight).stroke("#cccccc");
        doc.fillColor("#000000").font("Helvetica").fontSize(config.fontSize!);
      }

      const align = alignment?.[i] || "left";
      const currentY = doc.y;

      doc.text(cells[i], x + cellPadding, startY + cellPadding, {
        width: width - cellPadding * 2,
        align: align,
        lineBreak: true,
        height: rowHeight - cellPadding * 2,
        ellipsis: false,
        continued: false,
      });

      doc.y = currentY;
    }

    return startY + rowHeight;
  }

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

  private renderBlockquote(
    doc: PDFKit.PDFDocument,
    element: BlockquoteElement,
    config: PDFConfig
  ): void {
    const indent = 20;
    const borderWidth = 3;

    const startY = doc.y;
    const startX = config.margins!.left + indent;

    doc
      .moveTo(startX - 10, startY)
      .lineTo(startX - 10, doc.y + 20)
      .lineWidth(borderWidth)
      .stroke("#cccccc");

    doc.x = startX;
    doc
      .font("Helvetica-Oblique")
      .fontSize(config.fontSize!)
      .fillColor("#666666");

    this.renderTextWithFormatting(doc, element.text, element.formatting);

    doc.moveDown(1);

    doc.font("Helvetica").fillColor("#000000");
  }

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

  private addPageDetails(doc: PDFKit.PDFDocument, config: PDFConfig): void {
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      const oldMargins = { ...doc.page.margins };
      doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

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

      doc.page.margins = oldMargins;
    }
  }
}
