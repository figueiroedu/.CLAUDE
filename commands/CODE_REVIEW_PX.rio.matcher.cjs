/**
 * UserPromptSubmit Matcher for CODE_REVIEW_PX command (v2.0)
 *
 * Matches user prompts requesting code quality reviews, security checks,
 * performance analysis, and architecture evaluation.
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

  const keywords = [
    'review',
    'code quality',
    'security',
    'performance',
    'analyze',
    'architecture',
    'check',
    'lint'
  ];

  // Count matching keywords
  const matchCount = keywords.filter((keyword) => prompt.includes(keyword)).length;

  // IMPORTANT: All fields are MANDATORY and must not be undefined/null
  return {
    version: '2.0', // Required: always "2.0"
    matchCount: matchCount, // Required: number of matches (0+)
    type: 'command', // This is a command (slash command)
  };
};
