import { MarkdownToPdfCLI } from "../../cli";

describe("MarkdownToPdfCLI", () => {
  let cli: MarkdownToPdfCLI;

  beforeEach(() => {
    cli = new MarkdownToPdfCLI();
  });

  it("should be defined", () => {
    expect(cli).toBeDefined();
  });

  describe("parseArguments", () => {
    it("should parse input file path", () => {
      const args = ["input.md"];
      const result = cli.parseArguments(args);
      expect(result.inputPath).toBe("input.md");
      expect(result.options).toEqual({});
    });

    it("should parse output option", () => {
      const args = ["input.md", "-o", "output.pdf"];
      const result = cli.parseArguments(args);
      expect(result.inputPath).toBe("input.md");
      expect(result.options.output).toBe("output.pdf");
    });

    it("should parse page size option", () => {
      const args = ["--page-size", "A4", "input.md"];
      const result = cli.parseArguments(args);
      expect(result.options.pageSize).toBe("A4");
    });

    it("should parse margin option", () => {
      const args = ["--margin", "50", "input.md"];
      const result = cli.parseArguments(args);
      expect(result.options.margin).toBe(50);
    });

    it("should parse font size option", () => {
      const args = ["--font-size", "14", "input.md"];
      const result = cli.parseArguments(args);
      expect(result.options.fontSize).toBe(14);
    });

    it("should parse line height option", () => {
      const args = ["--line-height", "1.6", "input.md"];
      const result = cli.parseArguments(args);
      expect(result.options.lineHeight).toBe(1.6);
    });

    it("should parse no-page-numbers flag", () => {
      const args = ["--no-page-numbers", "input.md"];
      const result = cli.parseArguments(args);
      expect(result.options.noPageNumbers).toBe(true);
    });

    it("should parse help flag", () => {
      const args = ["--help"];
      const result = cli.parseArguments(args);
      expect(result.options.help).toBe(true);
    });

    it("should parse version flag", () => {
      const args = ["--version"];
      const result = cli.parseArguments(args);
      expect(result.options.version).toBe(true);
    });

    it("should handle mixed options", () => {
      const args = [
        "input.md",
        "-o",
        "out.pdf",
        "--page-size",
        "Letter",
        "--no-page-numbers",
      ];
      const result = cli.parseArguments(args);
      expect(result.inputPath).toBe("input.md");
      expect(result.options.output).toBe("out.pdf");
      expect(result.options.pageSize).toBe("Letter");
      expect(result.options.noPageNumbers).toBe(true);
    });
  });
});
