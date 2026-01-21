/**
 * i18n-portuguese-migration Agent Matcher (v2.0)
 *
 * Matches user prompts related to i18n migration tasks:
 * - Locating i18n files and their usages across the codebase
 * - Replacing i18n key references with Portuguese translations
 * - Removing or cleaning up i18n files after migration
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
    'migrate',
    'replace i18n',
    'find all places',
    'locate i18n',
    'remove i18n',
    'i18n',
    'portuguese'
  ];

  // Count matching keywords
  const matchCount = keywords.filter((keyword) => prompt.includes(keyword)).length;

  // IMPORTANT: All fields are MANDATORY and must not be undefined/null
  return {
    version: '2.0',
    matchCount: matchCount,
    type: 'agent'
  };
};
