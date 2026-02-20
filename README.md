# @kipppunkt/build

Autonomous AI coding workflow with human-in-the-loop via GitHub PRs:

@kipppunkt/build takes your features → implements → opens PRs → responds to reviews → repeats. 24/7.

You review & merge - from anywhere 🏝️

> **Want to see @kipppunkt/build in action?** [Check out the pull requests](https://github.com/issues?q=is%3Apr%20user%3Akipppunkt%20author%3Akipppunkt-agent) - kipp•punkt builds itself.

## Why kipp•punkt?

AI coding agents have already moved software engineering out of the IDE. But sitting in a terminal watching an agent work is just the next intermediary. The interface of the future is simpler: define what to build, review what was built.                               
                           
However, reviewing only after a feature is fully built produces mediocre results. Sometimes the agent lacks context, sometimes your requirements were wrong to begin with. Either way, you find out too late. So review earlier, via the interface you already use.

`@kipppunkt/build` is a step in this direction: an agent orchestrator that turns requirements into pull requests and reacts to your feedback. It works around the clock. You review from anywhere. Stay in the loop without staying at your desk.


## Quick start

**1. Create a bot GitHub account** and [generate a GitHub token](https://github.com/settings/tokens) with **repo** permissions. Invite the bot as a collaborator to your repo.

**2. Set `GH_TOKEN`** in your shell:

```bash
export GH_TOKEN=ghp_your_bot_token_here
```

**3. Configure git identity** so commits in agent workspaces use the bot account:

```bash
# Add to ~/.gitconfig
git config --global --add includeIf.gitdir:**/.kipppunkt/workspaces/.path ~/.gitconfig-kipppunkt

# Create ~/.gitconfig-kipppunkt
git config --file ~/.gitconfig-kipppunkt user.name "your-bot-username"
git config --file ~/.gitconfig-kipppunkt user.email "your-bot-username@users.noreply.github.com"
```

See [Bot account setup](#bot-account-setup) for more details.

**4. Create a requirements file**:

```json
[
  { "id": "F-001", "title": "Add dark mode", "description": "..." }
]
```

 See [Requirements file format](#requirements-file-format) for more details

**5. Run it**

```bash
npx @kipppunkt/build start \
  --requirements-path ./requirements.json \
  --command "claude -p {prompt} --dangerously-skip-permissions"
```

If you use a different harness than Claude Code, see [AI harness commands](#ai-harness-commands).

> **Caution:** in this case, the agent has access to your filesystem & network. For maximum safety, you should run it in a [containerized environment](https://georg.dev/blog/07-sandbox-your-github-copilot-cli-on-linux/).

## Set up

### Prerequisites

- **AI coding agent** (e.g. Claude Code, Codex CLI, OpenCode)
- **Separate GitHub account** for the agent (so PRs come from a distinct user)
- **[gh CLI](https://cli.github.com/)** authenticated as the agent's GitHub account
- **Git with HTTPS** - HTTPS is recommended (SSH works but requires extra setup)

### Installation

#### Global install (recommended)

For regular use, install globally so the binary persists:

```bash
npm install -g @kipppunkt/build
```

#### Direct download

Alternatively, you can also install it without NodeJS. Download the binary for your platform from [GitHub Releases](https://github.com/kipppunkt/build/releases) and place it on your `PATH`.

### Bot Account Setup

#### 1. Create a Bot GitHub Account

Create a separate GitHub account for the bot (e.g. `my-kipppunkt-agent`). Invite it as a collaborator to your repository.

#### 2. Generate a GitHub token

Log in as the bot account, then:

1. Go to **Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token → Generate new token (classic)** 
3. Grant all permissions for **repo**, then click on **Generate new token**
4. Copy the token

This single token covers both git credential auth and `gh` CLI auth.

#### 3. Set `GH_TOKEN`

In the shell where you run kipppunkt, set the token:

```bash
# Option A: inline (simplest, doesn't persist)
GH_TOKEN=ghp_your_bot_token_here npx @kipppunkt/build ...

# Option B: export in the current shell
export GH_TOKEN=ghp_your_bot_token_here
```

> **Note:** Consider [hiding this command from your bash history](https://dev.to/epranka/hide-the-exported-env-variables-from-the-history-49ni). Alternatively, for a persistent setup, consider using [direnv](https://direnv.net/) with a `.envrc` file in your project root.

#### 4. Configure Git Identity with `includeIf gitdir:`

Since all agent workspaces live under `.kipppunkt/workspaces/`, a single `includeIf` rule in your `~/.gitconfig` applies bot identity to all agent operations - without affecting your own git usage.

Add to your `~/.gitconfig`:

```gitconfig
[includeIf "gitdir:**/.kipppunkt/workspaces/"]
  path = ~/.gitconfig-kipppunkt
```

Then create `~/.gitconfig-kipppunkt` based on your auth method:

##### HTTPS (recommended)

HTTPS is the simplest setup - push auth is handled automatically by the orchestrator. You only need commit identity:

```gitconfig
# ~/.gitconfig-kipppunkt
[user]
  name = kipppunkt-agent
  email = kipppunkt-agent@users.noreply.github.com
```

Replace `kipppunkt-agent` with your bot's GitHub username.

##### SSH

Requires a separate SSH key registered to the bot's GitHub account. Unlike HTTPS, SSH users must also configure push auth here:

```gitconfig
# ~/.gitconfig-kipppunkt
[user]
  name = kipppunkt-agent
  email = kipppunkt-agent@users.noreply.github.com
[core]
  sshCommand = ssh -i ~/.ssh/kipppunkt-agent-key
```

Replace `~/.ssh/kipppunkt-agent-key` with the path to the bot's SSH private key.

> **Note:** `includeIf` only applies to `git` commands. The `gh` CLI uses `GH_TOKEN` regardless of auth method - make sure it's set (step 3).

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
| `--command` | Yes | - | Agent command template (see below) |
| `--requirements-path` | No | - | Path to requirements JSON file (for initial task ingress) |
| `--config-path` | No | `.kipppunkt/config.json` | Path to config file |
| `--log-level` | No | `info` | `error`, `warn`, `info`, or `debug` |
| `--retry-failed` | No | `false` | Reset all failed tasks to idle on startup |
| `--shutdown-on-task-failed` | No | `false` | Gracefully shut down when a task enters `failed` state |

#### AI harness commands

| Harness | Agent command template |
|---|---|
| Codex | `codex exec {prompt} --dangerously-bypass-approvals-and-sandbox` |
| Claude Code | `claude -p {prompt} --dangerously-skip-permissions` |
| OpenCode | `opencode run {prompt}` |
| Copilot CLI | `copilot -p {prompt}` |

### `ingress`

Loads tasks into the orchestrator task store. Requires the orchestrator to be running.

```bash
kipppunkt-build ingress --requirements <requirements.json> --url <orchestrator-url>
```

Required flags:

| Option | Required | Description |
|---|---|---|
| `--requirements` | Yes | Path to requirements JSON file |
| `--url` | Yes | Base URL of a running orchestrator API (for example `http://localhost:38291`) |

The orchestrator URL is logged to stdout upon start up.

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
  "mergeConflictResolution": "withThreads"
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

## Requirements file format

The requirements file is a JSON array of objects. 

The only required field is `id` (string). Structure beyond `id` is up to you - add whatever context helps your agent.

Try to write the requirements in a declarative way. Don't describe tasks. Instead describe acceptance criteria and provide context relevant for the final outcome.


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
    "custom_field": "any structure works"
  }
]
```