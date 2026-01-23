/**
 * UserPromptSubmit Matcher for skill-creator
 *
 * Triggers when users want to create, design, or update skills
 * that extend Claude's capabilities with specialized knowledge.
 */
module.exports = function (context) {
  const prompt = context.prompt.toLowerCase();

  const keywords = [
    'skill',
    'create',
    'skill.md',
    'script',
    'reference',
    'asset',
    'workflows',
    'capabilities',
  ];

  const matchCount = keywords.filter((keyword) => prompt.includes(keyword)).length;

  return {
    version: '2.0',
    matchCount: matchCount,
    type: 'skill',
  };
};
