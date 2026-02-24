/**
 * Product Management Skill UserPromptSubmit Matcher
 *
 * Detects code change requests requiring workflow orchestration:
 * - Planning and assessment of implementation tasks
 * - Complexity evaluation and delegation decisions
 * - Specification writing and QA coordination
 *
 * Triggers on: implement, add, create, build, refactor, fix, update, PM, spec, feature
 */
module.exports = function (context) {
  const prompt = context.prompt.toLowerCase();

  // Keywords for product-management skill detection
  const keywords = [
    'implement',
    'add',
    'create',
    'build',
    'refactor',
    'fix',
    'spec',
    'feature'
  ];

  // Count matching keywords
  const matchCount = keywords.filter((keyword) => prompt.includes(keyword)).length;

  // IMPORTANT: All fields are MANDATORY and must not be undefined/null
  return {
    version: '2.0', // Required: always "2.0"
    matchCount: matchCount, // Required: number of matches (0+)
    type: 'skill', // Required: identifies this as a skill matcher
  };
};
