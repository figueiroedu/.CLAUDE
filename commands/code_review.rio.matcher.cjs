/**
 * UserPromptSubmit Matcher for code_review command (v2.0)
 *
 * Reviews React/React Native code against Front-End Guild standards.
 * Analyzes file structure, components, TypeScript, accessibility, performance, and security.
 */
module.exports = function (context) {
  const prompt = context.prompt.toLowerCase();

  const keywords = [
    'review',
    'code review',
    'check',
    'audit',
    'analyze',
    'quality',
    'standards',
  ];

  const matchCount = keywords.filter((keyword) => prompt.includes(keyword)).length;

  return {
    version: '2.0',
    matchCount: matchCount,
    type: 'command',
  };
};
