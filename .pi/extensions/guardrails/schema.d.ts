/**
 * @typedef { 'PENDING' | 'RESOLVED' | 'REJECTED' | 'EXPIRED' } ExpectationState
 * @typedef { 'MANUAL' | 'CONSTRAINED_CMD' | 'SANDBOXED_TS' } ValidationType
 * 
 * @typedef {Object} Expectation
 * @property {string} id - Unique identifier (e.g., EXP-1)
 * @property {string} trigger - The action/path that triggered this expectation
 * @property {string} condition - Human-readable requirement
 * @property {ExpectationState} state - Current lifecycle state
 * @property {ValidationType} validationType - How the proof must be verified
 * @property {string|null} proof - Reference to the proof (path to script, human ID)
 * @property {number} timestamp - Unix timestamp of creation
 * @property {Object} metadata - Additional context (e.g., associated task ID)
 */
