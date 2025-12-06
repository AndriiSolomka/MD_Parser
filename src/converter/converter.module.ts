import { Module } from "@nestjs/common";
import { MarkdownParserService } from "./services/markdown-parser.service";
import { DocumentConverterService } from "./services/document-converter.service";
import { PdfGeneratorService } from "./services/pdf-generator.service";

@Module({
  providers: [
    MarkdownParserService,
    DocumentConverterService,
    PdfGeneratorService,
  ],
  exports: [
    MarkdownParserService,
    DocumentConverterService,
    PdfGeneratorService,
  ],
})
export class ConverterModule {}
