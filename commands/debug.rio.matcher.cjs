/**
 * UserPromptSubmit Matcher for Debug Command (v2.0)
 *
 * Matches prompts related to debugging issues by investigating logs,
 * database state, and git history.
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
    'debug',
    'investigate',
    'logs',
    'error',
    'troubleshoot',
    'issue',
    'diagnose',
    'analyze'
  ];

  const matchCount = keywords.filter((keyword) => prompt.includes(keyword)).length;

  return {
    version: '2.0',
    matchCount: matchCount,
    type: 'command',
  };
};
