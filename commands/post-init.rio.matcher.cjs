/**
 * UserPromptSubmit Matcher for post-init command (v2.0)
 *
 * Detects when users want to optimize CLAUDE.md files using HumanLayer best practices
 * with WHY/WHAT/HOW framework and progressive disclosure pattern.
 *
 * @param {Object} context - Matcher context
 * @param {string} context.prompt - User's prompt text
 * @returns {Object} Matcher result {version, matchCount, type}
 */
module.exports = function (context) {
  const prompt = context.prompt.toLowerCase();

  const keywords = [
    'optimize',
    'claude.md',
    'structure',
    'documentation',
    'setup',
    'refactor',
    'progressive disclosure',
  ];

  const matchCount = keywords.filter((keyword) => prompt.includes(keyword)).length;

  return {
    version: '2.0',
    matchCount: matchCount,
    type: 'command',
  };
};
