# todoist-pane

A Claude Code mod that shows your Todoist tasks in a side panel.

- Opens a **Todoist** panel when a session starts, or run `/todoist`
- Tasks sorted by due date, then priority (red dot = P1, yellow = P2, blue = P3)
- Click a task to complete it in Todoist
- Refreshes every few minutes, plus a **refresh** button

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install todoist-pane --marketplace dannytennet/todoist-pane
```

Answer `y` to add the marketplace, then press Enter to pick the user scope.

From a shell:

```
claude plugin install todoist-pane --marketplace dannytennet/todoist-pane
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `dannytennet/todoist-pane`, then Add plugin.

## Settings

### API token (required)

Get it in Todoist under Settings > Integrations > Developer. It's a secret, so it doesn't show in `/config`. Set it from a shell:

```
claude plugin configure todoist-pane --values-stdin
```

Paste `{"api_token": "YOUR_TOKEN"}`, press Enter, then Ctrl+D (Windows: Ctrl+Z, Enter). Then run `/reload-plugins` in Claude Code. `claude plugin configure todoist-pane` shows which settings are still unset.

### Other settings

These appear in `/config` under todoist-pane:

| Setting | What it does |
| --- | --- |
| Todoist filter | Which tasks to show, in Todoist filter syntax. Default `today \| overdue`. Empty shows all open tasks. |
| Refresh every (minutes) | Default 5. |

## Notes

The panel needs a Claude Code session that can draw panels (a terminal session, or a local session in the desktop app) and network access to `api.todoist.com`.
