import { describe, expect, test } from 'claude-code/testing'

const tasks = {
  results: [
    { id: '1', content: 'Pay electricity', priority: 4, due: { date: '2026-10-18' } },
    { id: '2', content: 'Call the bank', priority: 1, due: null },
  ],
  next_cursor: null,
}

const props = {
  title: 'Todoist', isFocused: false, bodyColumns: 40, placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 }, view: {},
}

for (const surface of ['terminal', 'desktop'] as const) {
  describe(surface, () => {
    test('lists tasks and completes one when pressed', { options: { api_token: 'tok', filter: 'today' } }, async ($, on) => {
      const calls: string[] = []
      on('http.fetch', async (_$, e) => {
        calls.push(`${e.init?.method ?? 'GET'} ${e.url}`)
        expect(e.init?.headers?.Authorization).toBe('Bearer tok')
        const body = e.url.includes('/tasks/filter') ? JSON.stringify(tasks) : '{}'
        return { value: { status: 200, ok: true, headers: {}, text: body } }
      })
      on('clock.now', async () => ({ value: 0 }))

      const ui = await $.ui.mount({
        plugin: 'todoist-pane', surface, component: 'Pane', requestId: 'todoist', props,
      })
      await ui.press({ key: 'refresh' })

      expect((await ui.find({ key: 't-1' }))?.text).toContain('Pay electricity')
      expect((await ui.find({ key: 't-2' }))?.text).toContain('Call the bank')
      expect(calls[0]).toContain('/api/v1/tasks/filter?')
      expect(calls[0]).toContain('query=today')

      await ui.press({ key: 't-1' })
      expect(calls).toContain('POST https://api.todoist.com/api/v1/tasks/1/close')
      expect(await ui.find({ key: 't-1' })).toBeUndefined()
    })

    test('asks for a token when none is set', async ($, on) => {
      const ui = await $.ui.mount({
        plugin: 'todoist-pane', surface, component: 'Pane', requestId: 'todoist', props,
      })
      await ui.press({ key: 'refresh' })
      expect((await ui.find({ type: 'Text', text: 'Set your Todoist API token' }))?.type).toBe('Text')
    })
  })
}
