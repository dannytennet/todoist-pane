import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Feed, Task } from '../types'

const PANE = 'todoist'
const TITLE = 'Todoist'
const API = 'https://api.todoist.com/api/v1'

const feed = atom({ plugin: 'todoist-pane', key: 'feed' } as const, { tasks: [] } as Feed)

type ApiTask = { id: string; content: string; priority: number; due?: { date?: string } | null }
type ApiPage = { results?: ApiTask[]; next_cursor?: string | null }

// Todoist's priority 4 is what the app shows as "P1".
const priorityColor = (p: number) =>
  p === 4 ? 'red' : p === 3 ? 'yellow' : p === 2 ? 'blue' : undefined

type Cfg = { token: string; filter: string; minutes: number }

function auth(cfg: Cfg) {
  return { Authorization: `Bearer ${cfg.token}` }
}

async function refresh($: EngineInterface, cfg: Cfg) {
  if (!cfg.token) {
    await update($, feed, f => ({ ...f, error: 'Set your Todoist API token: run "claude plugin configure todoist-pane --values-stdin" in a shell (see README).' }))
    return
  }
  try {
    const tasks: Task[] = []
    let cursor: string | null | undefined
    do {
      const params = new URLSearchParams({ limit: '200' })
      if (cfg.filter) params.set('query', cfg.filter)
      if (cursor) params.set('cursor', cursor)
      const path = cfg.filter ? '/tasks/filter' : '/tasks'
      const res = await $.http.fetch(`${API}${path}?${params}`, { headers: auth(cfg) })
      if (!res.ok) throw new Error(`Todoist answered ${res.status}`)
      const page = JSON.parse(res.text) as ApiPage
      for (const t of page.results ?? []) {
        tasks.push({ id: t.id, content: t.content, priority: t.priority, due: t.due?.date, isDone: false })
      }
      cursor = page.next_cursor
    } while (cursor && tasks.length < 1000)

    tasks.sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || b.priority - a.priority)
    const now = await $.clock.now()
    await update($, feed, () => ({ tasks, updatedAt: now }))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await update($, feed, f => ({ ...f, error: `Could not reach Todoist: ${message}` }))
  }
}

async function complete($: EngineInterface, cfg: Cfg, id: string) {
  await update($, feed, f => ({ ...f, tasks: f.tasks.map(t => (t.id === id ? { ...t, isDone: true } : t)) }))
  const res = await $.http.fetch(`${API}/tasks/${id}/close`, { method: 'POST', headers: auth(cfg) })
  if (!res.ok) {
    $.ui.toast(`Todoist: could not complete task (${res.status})`)
    await update($, feed, f => ({ ...f, tasks: f.tasks.map(t => (t.id === id ? { ...t, isDone: false } : t)) }))
  }
}

export const register: Register = (on, options) => {
  const cfg: Cfg = {
    token: String(options.api_token ?? '').trim(),
    filter: String(options.filter ?? '').trim(),
    minutes: Math.max(1, Number(options.refresh_minutes ?? 5)),
  }
  const { filter, minutes } = cfg

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'todoist', description: 'Open your Todoist tasks in a side panel' })
    void $.ui.open({ id: PANE, title: TITLE })
    void refresh($, cfg)
    $.clock.every(minutes * 60_000, () => void refresh($, cfg))

    return next(e)
  })

  on('command.run', { command: 'todoist' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: TITLE })
    void refresh($, cfg)
    if (!opened.isPlaced) return { text: `Todoist panel could not be shown: ${opened.reason}` }

    return { text: 'Todoist panel opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const { tasks, error, updatedAt } = await read($, feed)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 5)
    const open = tasks.filter(t => !t.isDone)

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1}>
          <Text bold>{filter || 'All tasks'}</Text>
          <Text dimColor>({open.length})</Text>
          <Button key="refresh" plain onPress={() => refresh($, cfg)}>
            <Text dimColor>refresh</Text>
          </Button>
        </Box>
        {error && <Text color="red">{error}</Text>}
        {!error && updatedAt && open.length === 0 && <Text dimColor>Nothing to do. Nice.</Text>}
        {!error && !updatedAt && <Text dimColor>Loading…</Text>}
        {open.slice(0, room).map(task => (
          <Button key={`t-${task.id}`} plain onPress={() => complete($, cfg, task.id)}>
            <Text color={priorityColor(task.priority)}>○</Text> {task.content}
            {task.due ? <Text dimColor> {task.due}</Text> : ''}
          </Button>
        ))}
        {open.length > room && <Text dimColor>+{open.length - room} more</Text>}
        <Text dimColor>Click a task to complete it.</Text>
      </Box>
    )
  })
}
