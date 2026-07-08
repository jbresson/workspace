/**
 * Librarian Stewardship Engine - Core Exports
 * 
 * Implements the Primitive Mapping Table per the specification.
 * All verbs route through LibrarianService which orchestrates:
 * - BinaryResolver: Locate and validate lean-ctx
 * - OutputParser: Parse + compress CLI output
 * - PathResolver: Enforce wip/ mirror for Canonical Intelligence
 * - LedgerManager: Atomic BUDDY.md operations
 */

export { BinaryResolver, BinaryResolutionResult } from './binary-resolver';
export { OutputParser, CompressionStats, ParsedOutput, ResultMetadata } from './output-parser';
export { PathResolver, PathResolutionResult } from './path-resolver';
export { LedgerManager, LedgerEntry, LedgerResponse } from './ledger-manager';
export { LibrarianService, LibrarianResult } from './librarian-service';

// Re-export as a namespace for convenience
import { LibrarianService } from './librarian-service';

export const Librarian = LibrarianService;
