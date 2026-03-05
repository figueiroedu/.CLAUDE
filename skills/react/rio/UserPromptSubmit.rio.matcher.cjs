/**
 * React Skill Matcher (v2.0)
 *
 * Matches user prompts related to React development including:
 * - Building React components with modern patterns
 * - React hooks and state management
 * - TypeScript in React applications
 * - Frontend debugging and performance optimization
 *
 * @param {Object} context - Matcher context
 * @param {string} context.prompt - User's prompt text
 * @param {string} context.cwd - Current working directory
 * @param {string} context.transcriptPath - Path to conversation transcript
 * @param {string} context.permissionMode - "ask" | "allow"
 * @param {string} context.sessionId - Session ID
 * @param {Object} context.meta - Meta information
 * @param {Object} context.transcript - Transcript utilities (for async usage)
 * @returns {Object} Matcher result with all required fields
 */
module.exports = function (context) {
  const prompt = context.prompt.toLowerCase();

  // Keywords for React skill matching
  const keywords = [
    'react',
    'hooks',
    'component',
    'typescript',
    'state management',
    'jsx',
    'performance',
    'debugging',
  ];

  // Count matching keywords
  const matchCount = keywords.filter((keyword) => prompt.includes(keyword)).length;

  // IMPORTANT: All fields are MANDATORY and must not be undefined/null
  return {
    version: '2.0',
    matchCount: matchCount,
    type: 'skill',
  };
};
