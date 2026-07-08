/**
 * OutputParser: Parse lean-ctx CLI output with token tracking
 * 
 * Handles:
 * - Extraction of compression stats
 * - Token savings calculation
 * - Structured result generation
 * - Footer generation with metadata
 */

export interface CompressionStats {
  original: number;
  compressed: number;
  ratio: number;
  savings: number;
}

export interface ParsedOutput {
  content: string;
  stats: CompressionStats;
}

export interface ResultMetadata {
  tokensSaved: number;
  compressionRatio: number;
  source: 'cli' | 'cache';
  timestamp: string;
}

export class OutputParser {
  /**
   * Parse lean-ctx output which typically ends with compression footer
   * Format: "Compressed X → Y tokens (Z%)"
   */
  static parseCompressionFooter(output: string): CompressionStats | null {
    const match = output.match(/Compressed\s+(\d+)\s*→\s*(\d+)\s+tokens\s*\((-?\d+)%\)/);
    if (!match) {
      return null;
    }

    const original = parseInt(match[1], 10);
    const compressed = parseInt(match[2], 10);
    const ratio = parseInt(match[3], 10);
    const savings = original - compressed;

    return {
      original,
      compressed,
      ratio,
      savings,
    };
  }

  /**
   * Extract content without the compression footer
   */
  static extractContent(output: string): string {
    // Remove lean-ctx footer
    return output
      .replace(/\n?Compressed\s+\d+\s*→\s*\d+\s+tokens\s*\(-?\d+%\)(\s*\|.*)?$/m, '')
      .trim();
  }

  /**
   * Parse CLI output into structured result
   */
  static parseLeanCtxOutput(rawOutput: string): ParsedOutput {
    const stats = this.parseCompressionFooter(rawOutput);
    const content = this.extractContent(rawOutput);

    return {
      content,
      stats: stats || {
        original: 0,
        compressed: rawOutput.length,
        ratio: 0,
        savings: 0,
      },
    };
  }

  /**
   * Generate footer with metadata for response
   */
  static withFooter(stats: CompressionStats, additionalContext?: string): string {
    const timestamp = new Date().toISOString();
    const footer = `\n─── Tokens: ${stats.original} → ${stats.compressed} (${stats.ratio}%) | Saved: ${stats.savings} ───`;
    const meta = additionalContext ? ` | ${additionalContext}` : '';
    return footer + meta;
  }

  /**
   * Build complete structured result for Librarian response
   */
  static buildResult(
    content: string,
    stats: CompressionStats,
    source: 'cli' | 'cache' = 'cli'
  ): {
    content: string;
    metadata: ResultMetadata;
  } {
    return {
      content,
      metadata: {
        tokensSaved: stats.savings,
        compressionRatio: stats.ratio,
        source,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
