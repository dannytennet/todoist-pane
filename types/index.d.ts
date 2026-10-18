export type Task = {
  id: string
  content: string
  priority: number
  due?: string
  isDone: boolean
}

export type Feed = {
  tasks: Task[]
  error?: string
  updatedAt?: number
}

declare module 'claude-code' {
  interface PluginState {
    'todoist-pane': { feed: Feed }
  }
}
