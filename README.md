# @kipppunkt/build

Autonomous AI coding workflow with human-in-the-loop via GitHub PRs:

`@kipppunkt/build` takes your features → implements → opens PRs → responds to reviews → repeats. 24/7.

You review - from anywhere 🏝️

> **Want to see `@kipppunkt/build` in action?** [Check out the pull requests](https://github.com/kipppunkt/build/pulls?q=is%3Apr+author%3Akipppunkt-agent) - kipp•punkt builds itself.

## Why `@kipppunkt/build`?

> From **Kipppunkt** (German: *tipping point*).

AI coding agents are already moving software engineering out of the IDE. But sitting in a terminal watching an agent type is just the next intermediary. 

The interface of the future is simpler: define what to build, review what was built.

`@kipppunkt/build` is the first concrete building block of the [kipp•punkt vision](https://github.com/kipppunkt): an agent orchestrator that turns requirements into pull requests and reacts to your feedback. It works around the clock. You review from anywhere. Stay in the loop without staying at your desk.

## Quick start

**1. Create a bot GitHub account** and [generate a GitHub token](https://github.com/settings/tokens) with `repo` permissions. Invite the bot as a collaborator to your repo.

**2. Set `GH_TOKEN`** in your shell:

```bash
export GH_TOKEN=ghp_your_bot_token_here
```

**3. Create a requirements file**:

```json
[
  { "id": "F-001", "title": "Add dark mode", "description": "..." }
]
```

See [Requirements file format](#requirements-file-format) for more details.

**4. Run it**

```bash
npx @kipppunkt/build start \
  --requirements-path ./requirements.json \
  --command "codex exec {prompt} --dangerously-bypass-approvals-and-sandbox"
```

If you use a different harness than Codex, see [AI harness commands](#ai-harness-commands).

> **Caution:** When using a harness command with sandbox/approval bypass flags, the agent has access to your filesystem & network. For maximum safety, you should run it in a [containerized environment](https://georg.dev/blog/07-sandbox-your-github-copilot-cli-on-linux/).

## Set up

### Prerequisites

- **AI coding agent** (e.g. Claude Code, Codex CLI, OpenCode)
- **[gh CLI](https://cli.github.com/)**
- **Separate GitHub account** for the agent (so PRs come from a distinct user)
- **Git with HTTPS** - HTTPS is recommended (SSH works but requires bot SSH key setup)

### Installation

#### Global install (recommended)

For regular use, install globally so the binary persists:

```bash
npm install -g @kipppunkt/build
```

#### Direct download

Alternatively, you can also install it without Node.Js. Download the binary for your platform from [GitHub Releases](https://github.com/kipppunkt/build/releases) and place it on your `PATH`.

### Bot Account Setup

#### 1. Create a Bot GitHub Account

Create a separate GitHub account for the bot (e.g. `my-kipppunkt-agent`). Invite it as a collaborator to your repository.

#### 2. Generate a GitHub token

Log in as the bot account, then:

1. Go to **Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token → Generate new token (classic)**
3. Grant all permissions for **repo**, then click on **Generate new token**
4. Copy the token

This single token covers git credential auth and `gh` CLI auth.

#### 3. Set `GH_TOKEN`

In the shell where you run kipppunkt, set the token:

```bash
# Option A: inline (simplest, doesn't persist)
GH_TOKEN=ghp_your_bot_token_here npx @kipppunkt/build ...

# Option B: export in the current shell
export GH_TOKEN=ghp_your_bot_token_here
```

> **Note:** Consider [hiding this command from your bash history](https://dev.to/epranka/hide-the-exported-env-variables-from-the-history-49ni). Alternatively, for a persistent setup, consider using [direnv](https://direnv.net/) with a `.envrc` file in your project root.

## CLI commands

### `start`

Starts the main orchestrator. 

```bash
kipppunkt-build start --command "<template>" [options]
```

On first launch, if `--requirements-path` is set, the orchestrator immediately starts assigning tasks to agents. Otherwise, it waits for tasks to be loaded into the system via the [`ingress`](#ingress) command.

Stop with Ctrl+C; the orchestrator persists state and resumes on next start.

| Option | Required | Default | Description |
|---|---|---|---|
| `--command` | Yes | - | Agent command template (see [AI harness command](#ai-harness-commands)) |
| `--requirements-path` | No | - | Path to requirements JSON file (for initial task ingress) |
| `--config-path` | No | `.kipppunkt/config.json` | Path to config file |
| `--log-level` | No | `info` | `error`, `warn`, `info`, or `debug` |
| `--retry-failed` | No | `false` | Reset all failed tasks to idle on startup |
| `--orchestrator-url` | No | `http://localhost:2309` | URL of the orchestrator API endpoint |
| `--shutdown-on-task-failed` | No | `false` | Gracefully shut down when a task enters `failed` state |

#### AI harness commands

| Harness | Agent command template |
|---|---|
| Codex | `codex exec {prompt} --dangerously-bypass-approvals-and-sandbox` |
| Claude Code | `claude -p {prompt} --dangerously-skip-permissions`¹ |
| OpenCode | `opencode run {prompt}` |
| Copilot CLI | `copilot -p {prompt}` |

[1] For Claude Code, you additionally need to pass the environment variable `IS_SANDBOX=1` to the process, e.g. `IS_SANDBOX=1 kipppunkt-build start --command "claude -p {prompt} --dangerously-skip-permissions"`

### `ingress`

Loads tasks into the orchestrator task store. Requires the orchestrator to be running.

```bash
kipppunkt-build ingress --requirements <requirements.json> --url <orchestrator-url>
```

| Option | Required | Default | Description |
|---|---|---|---|
| `--requirements` | Yes | - | Path to requirements JSON file |
| `--url` | No | `http://localhost:2309` | URL of the orchestrator API endpoint |

The orchestrator URL is logged to stdout upon startup.

## Config file

Optional JSON config at `.kipppunkt/config.json` (or path specified by `--config-path`).

```json
{
  "baseBranch": "main",
  "pollIntervalMinutes": 5,
  "maxConcurrency": 1,
  "maxFailedAttempts": 3,
  "statePath": "./.kipppunkt/state.json",
  "logLevel": "info",
  "pretext": "Always use TypeScript",
  "postWorkspaceCreation": "rm -rf node_modules && pnpm install",
  "allowlist": ["alice", "bob"],
  "requireMention": false,
  "shutdownOnTaskFailed": false,
  "mergeConflictResolution": "withThreads",
  "orchestratorUrl": "http://localhost:2222"
}
```

| Key | Type | Default | Description |
|---|---|---|---|
| `baseBranch` | string | `"main"` | Repository base branch name used for orchestrator reset and merge-conflict instructions |
| `pollIntervalMinutes` | number | `5` | Minutes between poll ticks (must be positive) |
| `maxConcurrency` | number | `1` | Maximum number of tasks under active development simultaneously (must be a positive integer) |
| `maxFailedAttempts` | number | `3` | Failed-attempt threshold before a task transitions to `failed` (must be a positive integer) |
| `statePath` | string | `./.kipppunkt/state.json` | Path where the orchestrator persists its state file |
| `logLevel` | `error` \| `warn` \| `info` \| `debug` | `info` | Log verbosity |
| `pretext` | string | `""` | Use this to inject project-wide instructions into every agent prompt |
| `postWorkspaceCreation` | string | `""` | Optional shell command run in the workspace cwd immediately after workspace creation and before the implement agent runs |
| `allowlist` | string[] | `[]` | Allowed reviewer GitHub usernames. Limits who can trigger agent reactions. **Note:** An empty allowlist permits *any* GitHub user to trigger agent reactions via PR comments. |
| `requireMention` | boolean | `false` | When `true`, a thread is only actionable if the latest comment @mentions the bot. Useful to avoid reacting to every comment |
| `shutdownOnTaskFailed` | boolean | `false` | When `true`, gracefully shut down when a task enters `failed` state |
| `mergeConflictResolution` | `"never"` \| `"withThreads"` \| `"always"` | `"withThreads"` | Controls auto-resolution of merge conflicts. `never`: no automatic merge conflict resolution. `withThreads`: attempt conflict resolution when actionable threads exist. `always`: invoke agent for conflict resolution even without threads |
| `orchestratorUrl` | string | `http://localhost:2309` | URL of the orchestrator API endpoint |

## Requirements file format

The requirements file is a JSON array of objects.

The only required field is `id` (string). Everything else is up to you, so add whatever context helps your agent.

Try to write requirements declaratively. Avoid implementation steps or instructions. Instead, describe acceptance criteria and any context relevant to the desired outcome.

### Requirement dependencies

Requirements are implemented in the order they are provided. In a single-agent setup, ordering them correctly is usually enough to avoid working on requirements whose dependencies are not ready yet.

For a multi-agent setup (`maxConcurrency > 1`), you can declare dependencies among requirements using the `dependsOn` field (array of task IDs). Both `dependsOn` and `depends_on` are accepted. A requirement will not start until all referenced dependencies are resolved.

### Example

```json
[
  {
    "id": "F-001",
    "title": "User search",
    "description": "Provide a field to search for other users on the platform",
    "acceptance_criteria": ["search field is visible on the page", "text input in the field displays a list of user suggestions", "the current user is never suggested"],
    "additional_context": ["docs/user-search.md", "https://my-awesome-ux.designs/user-search.png"]
  },
  {
    "id": "F-002",
    "title": "Dark mode",
    "dependsOn": ["F-001"],
    "custom_field": "any structure works"
  }
]
```
