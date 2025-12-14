import * as fs from "fs";
import { PDFParse, VerbosityLevel } from "pdf-parse";
import type { TextResult, InfoResult } from "pdf-parse";
import * as path from "path";
import { PDFDocument } from "pdf-lib";

export interface PdfContent {
  text: string;
  numpages: number;
  info: any;
  metadata: any;
  version: string;
}

/**
 * Parse PDF file and extract its content
 */
export async function parsePdf(filePath: string): Promise<PdfContent> {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({
    data: dataBuffer,
    verbosity: VerbosityLevel.ERRORS, // Suppress warnings
  });

  try {
    const textResult: TextResult = await parser.getText();
    const infoResult: InfoResult = await parser.getInfo();

    return {
      text: textResult.text,
      numpages: infoResult.total,
      info: infoResult.info || {},
      metadata: infoResult.metadata || {},
      version: "1.0",
    };
  } finally {
    await parser.destroy();
  }
}

/**
 * Assert that PDF contains specific text
 */
export async function assertPdfContainsText(
  filePath: string,
  expectedText: string | string[],
  caseSensitive: boolean = false
): Promise<void> {
  const pdfData = await parsePdf(filePath);
  let text = pdfData.text;

  const expectedTexts = Array.isArray(expectedText)
    ? expectedText
    : [expectedText];

  for (const expected of expectedTexts) {
    const searchText = caseSensitive ? expected : expected.toLowerCase();
    const searchInText = caseSensitive ? text : text.toLowerCase();

    if (!searchInText.includes(searchText)) {
      throw new Error(
        `Expected PDF to contain "${expected}", but it was not found.\nPDF content: ${text.substring(0, 500)}...`
      );
    }
  }
}

/**
 * Assert PDF page count
 */
export async function assertPdfPageCount(
  filePath: string,
  expectedCount: number
): Promise<void> {
  const pdfData = await parsePdf(filePath);
  if (pdfData.numpages !== expectedCount) {
    throw new Error(
      `Expected PDF to have ${expectedCount} pages, but found ${pdfData.numpages}`
    );
  }
}

/**
 * Assert PDF has minimum number of pages
 */
export async function assertPdfMinPages(
  filePath: string,
  minPages: number
): Promise<void> {
  const pdfData = await parsePdf(filePath);
  if (pdfData.numpages < minPages) {
    throw new Error(
      `Expected PDF to have at least ${minPages} pages, but found ${pdfData.numpages}`
    );
  }
}

/**
 * Assert PDF has metadata properties
 */
export async function assertPdfHasMetadata(
  filePath: string,
  expectedMetadata: { [key: string]: any }
): Promise<void> {
  const pdfData = await parsePdf(filePath);
  const info = pdfData.info || {};

  for (const [key, value] of Object.entries(expectedMetadata)) {
    if (info[key] !== value) {
      throw new Error(
        `Expected PDF metadata "${key}" to be "${value}", but found "${info[key]}"`
      );
    }
  }
}

/**
 * Assert PDF text contains headers in order
 */
export async function assertPdfContainsHeadersInOrder(
  filePath: string,
  headers: string[]
): Promise<void> {
  const pdfData = await parsePdf(filePath);
  const text = pdfData.text;

  let lastIndex = -1;
  for (const header of headers) {
    const index = text.indexOf(header);
    if (index === -1) {
      throw new Error(
        `Expected PDF to contain header "${header}", but it was not found`
      );
    }
    if (index <= lastIndex) {
      throw new Error(
        `Expected header "${header}" to appear after previous headers, but it appears before`
      );
    }
    lastIndex = index;
  }
}

/**
 * Assert PDF does not contain text
 */
export async function assertPdfNotContainsText(
  filePath: string,
  unexpectedText: string
): Promise<void> {
  const pdfData = await parsePdf(filePath);
  const text = pdfData.text.toLowerCase();

  if (text.includes(unexpectedText.toLowerCase())) {
    throw new Error(
      `Expected PDF not to contain "${unexpectedText}", but it was found`
    );
  }
}

/**
 * Get text content from PDF for custom assertions
 */
export async function getPdfText(filePath: string): Promise<string> {
  const pdfData = await parsePdf(filePath);
  return pdfData.text;
}

/**
 * Assert PDF file size is within expected range
 */
export function assertPdfFileSize(
  filePath: string,
  minSize: number,
  maxSize?: number
): void {
  const stats = fs.statSync(filePath);
  if (stats.size < minSize) {
    throw new Error(
      `Expected PDF file size to be at least ${minSize} bytes, but found ${stats.size} bytes`
    );
  }
  if (maxSize && stats.size > maxSize) {
    throw new Error(
      `Expected PDF file size to be at most ${maxSize} bytes, but found ${stats.size} bytes`
    );
  }
}

/**
 * Assert that table data appears in PDF in correct format
 */
export async function assertPdfContainsTableData(
  filePath: string,
  tableData: string[][]
): Promise<void> {
  const pdfData = await parsePdf(filePath);
  const text = pdfData.text;

  // Check if all table cells are present in the PDF
  for (const row of tableData) {
    for (const cell of row) {
      if (!text.includes(cell)) {
        throw new Error(
          `Expected PDF to contain table cell "${cell}", but it was not found`
        );
      }
    }
  }
}

/**
 * Get PDF page dimensions
 */
export async function getPdfPageDimensions(
  filePath: string
): Promise<{ width: number; height: number }> {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(dataBuffer);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();
  return { width, height };
}
