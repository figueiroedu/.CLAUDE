# Claude Code Custom Configuration

This repository contains custom agents, commands, and skills for Claude Code, enhanced with [claude-rio](https://github.com/alex-popov-tech/claude-rio) for deterministic activation.

## Directory Structure

```
.claude/
├── agents/           # Custom agents for specialized tasks
├── commands/         # Slash commands for quick actions
├── skills/           # Modular skills with bundled resources
└── README.md
```

## Available Tools

### Agents

Agents are specialized assistants launched via the `Task` tool for complex, multi-step operations.

| Agent | Description |
|-------|-------------|
| **i18n-portuguese-migration** | Migrates i18n references to hardcoded Portuguese text. Locates i18n files, maps keys to translations, and performs safe replacements in React/Vue/Angular codebases. |

**Usage:** Claude automatically invokes agents when relevant. Example prompts:
- "Migrate this component from i18n to Portuguese"
- "Find all `texts.welcome` usages and replace with Portuguese"

### Commands

Commands are invoked with `/command-name` syntax for specific workflows.

| Command | Description |
|---------|-------------|
| **/CODE_REVIEW_PX** | Comprehensive React/React Native code review following Front-End Guild standards. Analyzes security, performance, architecture, and TypeScript best practices. |

**Usage:**
```
/CODE_REVIEW_PX                    # Review all changed files vs main
/CODE_REVIEW_PX src/Component.tsx  # Review specific file
/CODE_REVIEW_PX abc123             # Review specific commit
/CODE_REVIEW_PX --full             # Full branch review
```

### Skills

Skills are modular packages that extend Claude's capabilities with specialized knowledge and workflows.

| Skill | Description |
|-------|-------------|
| **skill-creator** | Guide for creating new skills. Provides templates, validation, and packaging workflows. |
| **offline-first-react-native** | Implements offline-first patterns in React Native/Expo using MMKV, React Query, and NetInfo. |

**Usage:** Claude activates skills automatically based on context. Example prompts:
- "Create a new skill for handling PDF files"
- "Add offline support to my React Native app"

## Configuring claude-rio

[claude-rio](https://github.com/alex-popov-tech/claude-rio) improves how Claude Code activates skills, agents, and commands through keyword-based matching. Instead of relying solely on Claude's autonomous decisions, it provides explicit activation suggestions.

### Installation

**User-level (all projects):**
```bash
npx claude-rio setup --user
npx claude-rio generate-matchers --user
```

**Project-level (single project):**
```bash
npx claude-rio setup
npx claude-rio generate-matchers
```

### Requirements

- Node.js >= 18.0.0
- Claude Code CLI

### How It Works

When you submit a prompt, claude-rio:

1. Scans for matcher files (`.rio.matcher.cjs`) in your skills, agents, and commands
2. Executes matchers to determine relevance based on keywords
3. Sends suggestions to Claude in a structured format

Claude receives output like:
```
SUGGESTED (consider invoking):
- i18n-portuguese-migration: Task tool, subagent_type="i18n-portuguese-migration"
- CODE_REVIEW_PX: Skill tool
```

### Matcher Files

Each tool can have a matcher file that defines when it should be suggested:

```
agents/
├── i18n-portuguese-migration.md
└── i18n-portuguese-migration.rio.matcher.cjs

commands/
├── CODE_REVIEW_PX.md
└── CODE_REVIEW_PX.rio.matcher.cjs

skills/
└── skill-name/
    ├── SKILL.md
    └── rio/
        └── UserPromptSubmit.rio.matcher.cjs
```

### Creating Custom Matchers

Matchers are JavaScript functions that return a standardized object:

```javascript
// example.rio.matcher.cjs
module.exports = function (context) {
  const prompt = context.prompt.toLowerCase();
  const keywords = ['keyword1', 'keyword2', 'keyword3'];

  const matchCount = keywords.filter(kw => prompt.includes(kw)).length;

  return {
    version: "2.0",
    matchCount: matchCount,  // 0 = not suggested, >0 = ranked by count
    type: "skill",           // or "agent", "command"
  };
};
```

### Matcher Patterns

- **Keyword matching**: Simple substring matching (fastest)
- **Typo-tolerant**: Handles misspellings
- **File-based**: Detects project types via indicator files
- **History-aware**: Uses conversation context
- **Config-based**: Reads keywords from configuration

## Adding New Tools

### Adding an Agent

1. Create `agents/my-agent.md` with YAML frontmatter:
```yaml
---
name: my-agent
description: Description of when to use this agent
model: opus  # or sonnet, haiku
color: blue  # optional
---

Instructions for the agent...
```

2. (Optional) Create matcher: `agents/my-agent.rio.matcher.cjs`
3. Regenerate matchers: `npx claude-rio generate-matchers --user`

### Adding a Command

1. Create `commands/MY_COMMAND.md` with YAML frontmatter:
```yaml
---
allowed-tools: Read, Bash, Grep, Glob
argument-hint: [args description]
description: What the command does
---

Command instructions with $ARGUMENTS placeholder...
```

2. (Optional) Create matcher: `commands/MY_COMMAND.rio.matcher.cjs`
3. Regenerate matchers: `npx claude-rio generate-matchers --user`

### Adding a Skill

1. Create directory structure:
```
skills/my-skill/
├── SKILL.md           # Required
├── scripts/           # Optional: executable code
├── references/        # Optional: documentation
└── assets/            # Optional: templates, images
```

2. Add YAML frontmatter to `SKILL.md`:
```yaml
---
name: my-skill
description: Description of when to use this skill
---

Skill instructions...
```

3. (Optional) Create matcher: `skills/my-skill/rio/UserPromptSubmit.rio.matcher.cjs`
4. Regenerate matchers: `npx claude-rio generate-matchers --user`

## Tips

- Use descriptive names and descriptions for better auto-detection
- Test matchers with various prompt phrasings
- Keep SKILL.md focused; use `references/` for detailed documentation
- Regenerate matchers after adding or modifying tools
