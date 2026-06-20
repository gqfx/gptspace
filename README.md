# GPTSpace

Bring a Codex-style local coding workspace to ChatGPT through a self-hosted MCP server.

GPTSpace lets ChatGPT connect to selected local project folders, inspect code, edit files, run approved local commands, and work inside isolated Git worktrees. You run the server on your own machine, expose it through a tunnel you control, and approve access with an Owner password.

This fork focuses on a smoother ChatGPT connection flow, clearer workspace diagnostics, persistent OAuth client registration, safer file path handling, and optional command execution controls.

## Highlights

- Open configured workspaces by absolute path or by unique directory name, such as `reprokit`.
- Persist OAuth client registrations so reconnects survive local server restarts.
- Recover from stale MCP session IDs during reconnect initialization.
- Scope file tools to the opened workspace and validate real filesystem paths.
- Optionally disable local command execution with `DEVSPACE_COMMAND_TOOL=0`.
- Load project instructions from `AGENTS.md` and `CLAUDE.md`.
- Support optional ChatGPT Apps-compatible tool cards and change summaries.

## Requirements

- Node `>=20.12 <27`; Node 22 LTS is recommended.
- npm.
- Git.
- Bash-compatible shell for command execution. On Windows, use Git Bash, WSL, MSYS2, or Cygwin.
- A public HTTPS URL that forwards to the local GPTSpace server. Cloudflare Tunnel is recommended for local testing.

## Install

Install the CLI:

```bash
npm install -g @gqfx/gptspace
```

Initialize and start the server:

```bash
gptspace init
gptspace serve
```

Or run without a global install:

```bash
npx @gqfx/gptspace init
npx @gqfx/gptspace serve
```

The package also keeps a `devspace` command alias for compatibility with the upstream project and existing scripts.

## Configure

During `gptspace init`, choose:

- the local folders ChatGPT is allowed to open;
- the local server port, usually `7676`;
- the public HTTPS base URL for your tunnel, without `/mcp`.

Example public base URL:

```text
https://gptspace.example.com
```

The MCP client should use the full MCP endpoint:

```text
https://gptspace.example.com/mcp
```

When ChatGPT connects, GPTSpace opens an Owner password approval page. The Owner password is printed during setup and stored at:

```text
~/.devspace/auth.json
```

Keep that file private.

## Cloudflare Tunnel

GPTSpace does not manage tunnels for you. Cloudflare Tunnel is a convenient way to expose the local MCP server through HTTPS.

### Option A: Quick temporary tunnel

Use this for quick local testing:

```bash
cloudflared tunnel --url http://127.0.0.1:7676
```

Cloudflare prints a temporary HTTPS URL, usually ending in `trycloudflare.com`. Start GPTSpace with that origin:

```bash
DEVSPACE_PUBLIC_BASE_URL="https://your-temporary-url.trycloudflare.com" gptspace serve
```

Then configure ChatGPT with:

```text
https://your-temporary-url.trycloudflare.com/mcp
```

Temporary tunnel URLs change between runs. If the URL changes, restart GPTSpace with the new `DEVSPACE_PUBLIC_BASE_URL` or update the saved config:

```bash
gptspace config set publicBaseUrl https://your-new-url.trycloudflare.com
```

### Option B: Named Cloudflare Tunnel with your own domain

Use this for a stable domain:

```bash
cloudflared tunnel login
cloudflared tunnel create gptspace
cloudflared tunnel route dns gptspace gptspace.example.com
```

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: gptspace
credentials-file: /Users/you/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: gptspace.example.com
    service: http://127.0.0.1:7676
  - service: http_status:404
```

Run the tunnel:

```bash
cloudflared tunnel run gptspace
```

Configure GPTSpace with the origin only:

```bash
gptspace config set publicBaseUrl https://gptspace.example.com
gptspace serve
```

Configure ChatGPT with:

```text
https://gptspace.example.com/mcp
```

## Common local workflow

```bash
# terminal 1: run your tunnel
cloudflared tunnel --url http://127.0.0.1:7676

# terminal 2: run GPTSpace
DEVSPACE_PUBLIC_BASE_URL="https://your-url.trycloudflare.com" \
DEVSPACE_LOG_FORMAT=pretty \
DEVSPACE_LOG_LEVEL=debug \
gptspace serve
```

Then ask ChatGPT to open a workspace. If your allowed root is `~/codes`, you can say:

```text
Open reprokit through GPTSpace.
```

GPTSpace can resolve a unique matching directory under configured allowed roots.

## Useful environment variables

| Variable | Purpose |
| --- | --- |
| `DEVSPACE_ALLOWED_ROOTS` | Comma-separated local roots that workspaces may open. Overrides saved config. |
| `DEVSPACE_PUBLIC_BASE_URL` | Public HTTPS origin, without `/mcp`. Useful for temporary tunnels. |
| `DEVSPACE_ALLOWED_HOSTS` | Optional Host header allowlist override. Use `*` only for local debugging. |
| `DEVSPACE_OAUTH_OWNER_TOKEN` | Owner password for OAuth approval. Must be at least 16 characters. |
| `DEVSPACE_STATE_DIR` | SQLite state directory for workspace sessions and OAuth client registrations. |
| `DEVSPACE_WORKTREE_ROOT` | Directory for managed Git worktrees. |
| `DEVSPACE_COMMAND_TOOL` | Set to `0`, `false`, `no`, or `off` to disable local command execution. |
| `DEVSPACE_LOG_FORMAT` | Use `pretty` for local debugging or `json` for structured logs. |
| `DEVSPACE_LOG_LEVEL` | `silent`, `error`, `warn`, `info`, or `debug`. |

## What ChatGPT can do

After approval, ChatGPT can use GPTSpace tools to:

- open a workspace under an allowed root;
- read, write, and edit files in the workspace;
- search code and inspect directories;
- run local commands when command execution is enabled;
- create isolated Git worktrees for parallel work;
- follow instructions from `AGENTS.md` and `CLAUDE.md`;
- discover local agent skills;
- show tool cards and change summaries in compatible hosts.

## Security model

GPTSpace is remote access to selected local folders.

You decide which roots are allowed. File tools are scoped to the opened workspace and validate real filesystem paths, including symlink targets. Command execution is intentionally powerful because it runs as your local user. Treat a connected MCP client like a trusted coding partner with access to your machine.

For safer local use, disable command execution:

```bash
DEVSPACE_COMMAND_TOOL=0 gptspace serve
```

Prefer narrow allowed roots, such as:

```text
~/codes/reprokit
~/work/specific-project
```

Avoid broad roots like `~`, `/`, or `C:\`.

## Local development

```bash
npm install --include=dev
npm run dev
npm run typecheck
npm test
npm run build
npm run start
```

`npm run dev` watches `src` and restarts the server after changes or crashes.

To install the current checkout globally for local testing:

```bash
npm run build
npm link

gptspace doctor
gptspace serve
```

To simulate an npm release locally:

```bash
npm run build
npm pack
npm install -g ./gqfx-gptspace-*.tgz
```

## Documentation

- [Setup Guide](docs/setup.md)
- [ChatGPT Coding Workflow](docs/chatgpt-coding-workflow.md)
- [Configuration Reference](docs/configuration.md)
- [Security Model](docs/security.md)
- [Troubleshooting Gotchas](docs/gotchas.md)

Some documentation files may still contain upstream DevSpace wording while this fork is being rebranded.

## Acknowledgements

GPTSpace is forked from and inspired by [Waishnav/devspace](https://github.com/Waishnav/devspace). Thanks to Waishnav for the original DevSpace project and for the core idea: giving MCP-capable hosts such as ChatGPT a secure, inspectable bridge into local coding workspaces.

This repository builds on that foundation and adapts the workflow for this fork's ChatGPT-focused local development use cases.
