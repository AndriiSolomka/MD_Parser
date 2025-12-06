#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { MarkdownParserService } from "./converter/services/markdown-parser.service";
import { DocumentConverterService } from "./converter/services/document-converter.service";
import { PdfGeneratorService } from "./converter/services/pdf-generator.service";

/**
 * CLI Tool for Markdown to PDF Conversion
 *
 * Usage:
 *   ts-node src/cli.ts <input.md> [output.pdf]
 *   npm run cli <input.md> [output.pdf]
 */

class MarkdownToPdfCLI {
  private parser: MarkdownParserService;
  private converter: DocumentConverterService;
  private generator: PdfGeneratorService;

  constructor() {
    this.parser = new MarkdownParserService();
    this.converter = new DocumentConverterService();
    this.generator = new PdfGeneratorService();
  }

  async convert(inputPath: string, outputPath?: string): Promise<void> {
    try {
      // Validate input file
      if (!fs.existsSync(inputPath)) {
        console.error(`Error: Input file not found: ${inputPath}`);
        process.exit(1);
      }

      if (!inputPath.endsWith(".md")) {
        console.error("Error: Input file must be a .md markdown file");
        process.exit(1);
      }

      // Determine output path
      const finalOutputPath = outputPath || inputPath.replace(/\.md$/, ".pdf");
      const baseDir = path.dirname(path.resolve(inputPath));

      console.log(`Converting: ${inputPath}`);
      console.log(`Output: ${finalOutputPath}`);
      console.log(`Base directory: ${baseDir}`);
      console.log();

      // Read markdown file
      const markdown = fs.readFileSync(inputPath, "utf-8");
      console.log(`✓ Read ${markdown.length} characters from ${inputPath}`);

      // Parse markdown
      const tokens = this.parser.parse(markdown);
      console.log(`✓ Parsed ${tokens.length} tokens`);

      // Convert to document
      const document = await this.converter.convert(tokens, baseDir);
      console.log(
        `✓ Converted to document with ${document.elements.length} elements`
      );

      // Generate PDF
      await this.generator.generate(document, finalOutputPath);
      console.log(`✓ Generated PDF: ${finalOutputPath}`);

      const stats = fs.statSync(finalOutputPath);
      console.log(`✓ File size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log();
      console.log("Conversion completed successfully! ✨");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`Error during conversion: ${errorMessage}`);
      if (errorStack) {
        console.error(errorStack);
      }
      process.exit(1);
    }
  }

  showHelp(): void {
    console.log(`
Markdown to PDF Converter CLI

Usage:
  ts-node src/cli.ts <input.md> [output.pdf]
  npm run cli <input.md> [output.pdf]

Arguments:
  input.md      Path to input markdown file (required)
  output.pdf    Path to output PDF file (optional, defaults to input name with .pdf extension)

Examples:
  ts-node src/cli.ts document.md
  ts-node src/cli.ts document.md output.pdf
  npm run cli README.md
  npm run cli docs/guide.md docs/guide.pdf

Supported Markdown Features:
  - Headings (# to ######)
  - Bold (**text** or __text__)
  - Italic (*text* or _text_)
  - Inline code (\`code\`)
  - Code blocks (\`\`\`language)
  - Unordered lists (- or *)
  - Ordered lists (1. 2. 3.)
  - Links ([text](url))
  - Images (![alt](url))
  - Tables (pipe-separated)
  - Blockquotes (> text)
  - Horizontal rules (---, ***)
    `);
  }
}

// Main execution
const cli = new MarkdownToPdfCLI();
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  cli.showHelp();
  process.exit(0);
}

const inputPath = args[0];
const outputPath = args[1];

cli.convert(inputPath, outputPath);
