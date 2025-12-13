#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { MarkdownParserService } from "./converter/services/markdown-parser.service";
import { DocumentConverterService } from "./converter/services/document-converter.service";
import { PdfGeneratorService } from "./converter/services/pdf-generator.service";
import { PDFConfig } from "./converter/types/document";

/**
 * CLI Tool for Markdown to PDF Conversion
 *
 * Usage:
 *   ts-node src/cli.ts [options] <input.md>
 *   npm run cli -- [options] <input.md>
 */

export interface CLIOptions {
  output?: string;
  config?: string;
  pageSize?: "A4" | "Letter" | "Legal";
  margin?: number;
  fontSize?: number;
  lineHeight?: number;
  noPageNumbers?: boolean;
  help?: boolean;
  version?: boolean;
}

export class MarkdownToPdfCLI {
  private parser: MarkdownParserService;
  private converter: DocumentConverterService;
  private generator: PdfGeneratorService;
  private readonly VERSION = "1.0.0";

  constructor() {
    this.parser = new MarkdownParserService();
    this.converter = new DocumentConverterService();
    this.generator = new PdfGeneratorService();
  }

  parseArguments(args: string[]): { options: CLIOptions; inputPath: string } {
    const options: CLIOptions = {};
    let inputPath = "";

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === "-o" && i + 1 < args.length) {
        options.output = args[++i];
      } else if (arg === "--config" && i + 1 < args.length) {
        options.config = args[++i];
      } else if (arg === "--page-size" && i + 1 < args.length) {
        const size = args[++i];
        if (size === "A4" || size === "Letter" || size === "Legal") {
          options.pageSize = size;
        } else {
          console.error(
            `Invalid page size: ${size}. Use A4, Letter, or Legal.`
          );
          process.exit(1);
        }
      } else if (arg === "--margin" && i + 1 < args.length) {
        options.margin = parseInt(args[++i], 10);
      } else if (arg === "--font-size" && i + 1 < args.length) {
        options.fontSize = parseInt(args[++i], 10);
      } else if (arg === "--line-height" && i + 1 < args.length) {
        options.lineHeight = parseFloat(args[++i]);
      } else if (arg === "--no-page-numbers") {
        options.noPageNumbers = true;
      } else if (arg === "-h" || arg === "--help") {
        options.help = true;
      } else if (arg === "--version") {
        options.version = true;
      } else if (!arg.startsWith("-")) {
        inputPath = arg;
      } else {
        console.error(`Unknown option: ${arg}`);
        this.showHelp();
        process.exit(1);
      }
    }

    return { options, inputPath };
  }

  private loadConfig(configPath: string): Partial<PDFConfig> {
    try {
      if (!fs.existsSync(configPath)) {
        console.warn(`Warning: Config file not found: ${configPath}`);
        return {};
      }
      const configContent = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(configContent);
    } catch (error) {
      console.error(
        `Error loading config file: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return {};
    }
  }

  async convert(inputPath: string, options: CLIOptions = {}): Promise<void> {
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
      const finalOutputPath =
        options.output || inputPath.replace(/\.md$/, ".pdf");
      const baseDir = path.dirname(path.resolve(inputPath));

      console.log(`Converting: ${inputPath}`);
      console.log(`Output: ${finalOutputPath}`);

      // Build PDF configuration
      let pdfConfig: Partial<PDFConfig> = {};

      // Load from config file if specified
      if (options.config) {
        pdfConfig = this.loadConfig(options.config);
        console.log(`Loaded configuration from ${options.config}`);
      }

      // Override with CLI options
      if (options.pageSize) {
        pdfConfig.pageSize = options.pageSize;
      }
      if (options.margin !== undefined) {
        pdfConfig.margins = {
          top: options.margin,
          bottom: options.margin,
          left: options.margin,
          right: options.margin,
        };
      }
      if (options.fontSize) {
        pdfConfig.fontSize = options.fontSize;
      }
      if (options.lineHeight) {
        pdfConfig.lineHeight = options.lineHeight;
      }

      // Handle page numbers
      if (options.noPageNumbers) {
        pdfConfig.showPageNumbers = false;
      }

      // Log active settings
      if (pdfConfig.pageSize) console.log(`Page size: ${pdfConfig.pageSize}`);
      if (pdfConfig.margins) console.log(`Margins: ${pdfConfig.margins.top}pt`);
      if (pdfConfig.fontSize) console.log(`Font size: ${pdfConfig.fontSize}pt`);
      if (pdfConfig.lineHeight)
        console.log(`Line height: ${pdfConfig.lineHeight}`);
      if (pdfConfig.showPageNumbers) console.log(`Page numbers: enabled`);
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

      // Generate PDF with configuration
      await this.generator.generate(document, finalOutputPath, pdfConfig);
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
  npm run cli -- [options] <input.md>

Options:
  -o <file>              Output file path
  --config <file>        Load config from JSON file
  --page-size <size>     Page size (A4, Letter, Legal) [default: A4]
  --margin <n>           Set all margins to n points [default: 72]
  --font-size <n>        Base font size in points [default: 12]
  --line-height <n>      Line spacing multiplier [default: 1.5]
  --no-page-numbers      Disable page numbers
  -h, --help             Show this help message
  --version              Show version number

Examples:
  npm run cli -- document.md
  npm run cli -- document.md -o output.pdf
  npm run cli -- document.md --config my-config.json
  npm run cli -- document.md --page-size Letter --margin 50
  npm run cli -- document.md --font-size 14 --line-height 1.8
  npm run cli -- document.md -o out.pdf --page-size Legal --margin 60

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

  showVersion(): void {
    console.log(`Markdown to PDF Converter v${this.VERSION}`);
  }
}

// Main execution
if (require.main === module) {
  const cli = new MarkdownToPdfCLI();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    cli.showHelp();
    process.exit(0);
  }

  const { options, inputPath } = cli.parseArguments(args);

  if (options.help) {
    cli.showHelp();
    process.exit(0);
  }

  if (options.version) {
    cli.showVersion();
    process.exit(0);
  }

  if (!inputPath) {
    console.error("Error: No input file specified");
    cli.showHelp();
    process.exit(1);
  }

  cli.convert(inputPath, options);
}
