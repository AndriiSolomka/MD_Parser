// Jest setup file for PDF parsing tests
// This provides polyfills for browser APIs needed by pdf-parse

// Mock process.getBuiltinModule if not available (Node.js compatibility)
if (typeof process.getBuiltinModule === "undefined") {
  (process as any).getBuiltinModule = (moduleName: string) => {
    // Return a mock module object with createRequire
    if (moduleName === "module") {
      return {
        createRequire: () => require,
      };
    }
    return undefined;
  };
}

// Mock DOMMatrix for Node.js environment
global.DOMMatrix = class DOMMatrix {
  constructor() {
    // Minimal DOMMatrix implementation
  }
} as any;

// Mock canvas if needed
if (typeof global.ImageData === "undefined") {
  global.ImageData = class ImageData {
    constructor(
      public width: number,
      public height: number
    ) {}
  } as any;
}

if (typeof global.Path2D === "undefined") {
  global.Path2D = class Path2D {} as any;
}
