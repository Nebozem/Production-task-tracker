import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, FormEvent, ReactNode, SetStateAction, WheelEvent } from 'react'
import './App.css'
import yafiImage from './assets/YAFI.webp'

type Task = {
  id: number
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high'
  starts_at: string | null
  deadline: string | null
  assigned_to: number | null
  assigned_to_login: string | null
  assigned_user_ids: number[]
  assigned_user_logins: string[]
  tags: { id: number; name: string; color: string }[]
  stages: { id: number; title: string; is_done: boolean; order_index: number }[]
  comments: { id: number; author_id: number; text: string; created_at: string }[]
}

type User = {
  id: number
  login: string
  role: 'admin' | 'employee'
  is_active: boolean
}

type CurrentUser = {
  id: number
  login: string
  role: 'admin' | 'employee'
}

type AuthState = {
  token: string
}

type Tag = { id: number; name: string; color: string }

type CalendarLane = {
  task: Task
  row: number
  colStart: number
  colEnd: number
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
const DAY_MS = 24 * 60 * 60 * 1000

const generateTagColor = (name: string): string => {
  const colors = [
    '#1f2937', // slate-800 (dark blue-gray)
    '#991b1b', // red-900
    '#7c2d12', // orange-900
    '#78350f', // amber-900
    '#15803d', // green-800
    '#0f766e', // teal-800
    '#0c4a6e', // sky-900
    '#1e3a8a', // blue-900
    '#4c1d95', // violet-900
    '#831843', // rose-900
    '#4b5563', // slate-700
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const getTextColorForBackground = (bgColorHex: string): string => {
  const hex = bgColorHex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness < 128 ? '#ffffff' : '#000000'
}
const VISIBLE_DAYS = 6
const STATUS_LABELS: Record<Task['status'], string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  review: 'На проверке',
  completed: 'Выполнена',
}
const PRIORITY_LABELS: Record<Task['priority'], string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

function startOfWeek(date: Date) {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const shift = (normalized.getDay() + 6) % 7
  return new Date(normalized.getTime() - shift * DAY_MS)
}

function toDateOnly(value: string | null) {
  if (!value) return null
  const [datePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDateTime(value: string | null) {
  if (!value) return 'Не задано'
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toInputDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="form-field">
      <span className="form-field__label">{label}</span>
      {children}
    </label>
  )
}

function App() {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskStartsAt, setTaskStartsAt] = useState('')
  const [taskDeadline, setTaskDeadline] = useState('')
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('medium')
  const [taskTagNames, setTaskTagNames] = useState<string[]>([])
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<number[]>([])
  const [newUserLogin, setNewUserLogin] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'employee'>('employee')
  const [newTagName, setNewTagName] = useState('')
  const [editingTagId, setEditingTagId] = useState<number | null>(null)
  const [editingTagName, setEditingTagName] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [commentText, setCommentText] = useState('')
  const [windowStart, setWindowStart] = useState(() => startOfWeek(new Date()))
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showTagsMenu, setShowTagsMenu] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [editTaskDescription, setEditTaskDescription] = useState('')
  const [editTaskStartsAt, setEditTaskStartsAt] = useState('')
  const [editTaskDeadline, setEditTaskDeadline] = useState('')
  const [editTaskAssigneeIds, setEditTaskAssigneeIds] = useState<number[]>([])
  const [editTaskTagNames, setEditTaskTagNames] = useState<string[]>([])
  const [editTaskStatus, setEditTaskStatus] = useState<Task['status']>('todo')
  const [editTaskPriority, setEditTaskPriority] = useState<Task['priority']>('medium')

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers)
    if (auth?.token) headers.set('Authorization', `Bearer ${auth.token}`)
    return fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  }

  const windowEnd = new Date(windowStart.getTime() + (VISIBLE_DAYS - 1) * DAY_MS)

  const fetchTasks = async (): Promise<void> => {
    const from = windowStart.toISOString().slice(0, 10)
    const to = windowEnd.toISOString().slice(0, 10)
    const response = await apiFetch(`/tasks/calendar?date_from=${from}&date_to=${to}`)
    if (!response.ok) throw new Error('Не удалось загрузить задачи')
    setTasks((await response.json()) as Task[])
  }

  const fetchMe = async (): Promise<CurrentUser> => {
    const response = await apiFetch('/users/me')
    if (!response.ok) throw new Error('Не удалось получить пользователя')
    return (await response.json()) as CurrentUser
  }

  const loadUsers = async (role: CurrentUser['role']) => {
    if (role !== 'admin') {
      setUsers([])
      return
    }
    const response = await apiFetch('/users')
    if (response.ok) setUsers((await response.json()) as User[])
  }

  const loadTags = async () => {
    const response = await apiFetch('/tags')
    if (response.ok) setTags((await response.json()) as Tag[])
  }

  useEffect(() => {
    if (!auth) {
      setMe(null)
      setIsLoading(false)
      return
    }
    const bootstrap = async () => {
      try {
        setError(null)
        setIsLoading(true)
        const currentUser = await fetchMe()
        setMe(currentUser)
        await Promise.all([fetchTasks(), loadUsers(currentUser.role), loadTags()])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ошибка загрузки'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }
    void bootstrap()
  }, [auth, windowStart])

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  )

  useEffect(() => {
    if (!selectedTask) {
      setEditTaskTitle('')
      setEditTaskDescription('')
      setEditTaskStartsAt('')
      setEditTaskDeadline('')
      setEditTaskAssigneeIds([])
      setEditTaskStatus('todo')
      setEditTaskPriority('medium')
      return
    }

    setEditTaskTitle(selectedTask.title)
    setEditTaskDescription(selectedTask.description)
    setEditTaskStartsAt(toInputDateTime(selectedTask.starts_at))
    setEditTaskDeadline(toInputDateTime(selectedTask.deadline))
    setEditTaskAssigneeIds(selectedTask.assigned_user_ids)
    setEditTaskTagNames(selectedTask.tags.map(tag => tag.name))
    setEditTaskStatus(selectedTask.status)
    setEditTaskPriority(selectedTask.priority)
  }, [selectedTask])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const body = new URLSearchParams()
    body.set('username', login)
    body.set('password', password)
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!response.ok) {
      setError('Неверный логин или пароль')
      return
    }
    const tokenPayload = (await response.json()) as { access_token: string }
    setAuth({ token: tokenPayload.access_token })
  }

  const validateTaskRange = (startsAt: string, deadline: string) => {
    if (!startsAt || !deadline) {
      throw new Error('Укажите дату начала и дедлайн')
    }
    if (new Date(startsAt).getTime() > new Date(deadline).getTime()) {
      throw new Error('Дедлайн не может быть раньше даты начала')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return

    try {
      validateTaskRange(taskStartsAt, taskDeadline)
      setError(null)
      const response = await apiFetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          starts_at: taskStartsAt,
          deadline: taskDeadline,
          priority: taskPriority,
          assigned_user_ids: taskAssigneeIds,
          tags: taskTagNames,
        }),
      })

      if (!response.ok) {
        const details = await response.json().catch(() => ({ detail: 'Не удалось создать задачу' }))
        throw new Error(details.detail ?? 'Не удалось создать задачу')
      }

      setTitle('')
      setDescription('')
      setTaskStartsAt('')
      setTaskDeadline('')
      setTaskPriority('medium')
      setTaskTagNames([])
      setTaskAssigneeIds([])
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла неизвестная ошибка')
    }
  }

  const updateTaskStatus = async (task: Task, status: Task['status']) => {
    try {
      setError(null)
      const response = await apiFetch(`/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error('Не удалось обновить задачу')
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла неизвестная ошибка')
    }
  }

  const saveTaskEdits = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTask || !editTaskTitle.trim()) return

    try {
      validateTaskRange(editTaskStartsAt, editTaskDeadline)
      setError(null)
      const response = await apiFetch(`/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTaskTitle.trim(),
          description: editTaskDescription.trim(),
          starts_at: editTaskStartsAt,
          deadline: editTaskDeadline,
          priority: editTaskPriority,
          assigned_user_ids: editTaskAssigneeIds,
          tags: editTaskTagNames,
          status: editTaskStatus,
        }),
      })

      if (!response.ok) {
        const details = await response.json().catch(() => ({ detail: 'Не удалось сохранить задачу' }))
        throw new Error(details.detail ?? 'Не удалось сохранить задачу')
      }

      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла неизвестная ошибка')
    }
  }

  const deleteTask = async (taskId: number) => {
    try {
      setError(null)
      const response = await apiFetch(`/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Не удалось удалить задачу')
      setSelectedTaskId((current) => (current === taskId ? null : current))
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла неизвестная ошибка')
    }
  }

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const response = await apiFetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: newUserLogin,
        password: newUserPassword,
        role: newUserRole,
      }),
    })
    if (!response.ok) {
      const details = await response.json().catch(() => ({ detail: 'Не удалось создать пользователя' }))
      setError(details.detail ?? 'Не удалось создать пользователя')
      return
    }
    setNewUserLogin('')
    setNewUserPassword('')
    setNewUserRole('employee')
    if (me) await loadUsers(me.role)
  }

  const addComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTaskId || !commentText.trim()) return
    const response = await apiFetch(`/tasks/${selectedTaskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentText.trim() }),
    })
    if (!response.ok) {
      setError('Не удалось добавить комментарий')
      return
    }
    await fetchTasks()
    setCommentText('')
  }

  const createTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newTagName.trim()) return
    const response = await apiFetch('/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim() }),
    })
    if (!response.ok) {
      const details = await response.json().catch(() => ({ detail: 'Не удалось создать тег' }))
      setError(details.detail ?? 'Не удалось создать тег')
      return
    }
    setNewTagName('')
    await loadTags()
  }

  const updateTag = async (tagId: number) => {
    if (!editingTagName.trim()) return
    const response = await apiFetch(`/tags/${tagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingTagName.trim() }),
    })
    if (!response.ok) {
      setError('Не удалось изменить тег')
      return
    }
    setEditingTagId(null)
    setEditingTagName('')
    await loadTags()
  }

  const deleteTag = async (tagId: number) => {
    const response = await apiFetch(`/tags/${tagId}`, { method: 'DELETE' })
    if (!response.ok) {
      setError('Не удалось удалить тег')
      return
    }
    setTaskTagNames((prev) => prev.filter((name) => tags.find((tag) => tag.id === tagId)?.name !== name))
    await loadTags()
  }

  const shiftWindow = (days: number) => {
    setWindowStart((prev) => new Date(prev.getTime() + days * DAY_MS))
  }

  const handleCalendarWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    shiftWindow(event.deltaY > 0 ? 1 : -1)
  }

  const handleTimelineBodyWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const toggleAssignee = (userId: number, setter: Dispatch<SetStateAction<number[]>>) => {
    setter((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]))
  }

  const visibleDates = useMemo(
    () => Array.from({ length: VISIBLE_DAYS }, (_, index) => new Date(windowStart.getTime() + index * DAY_MS)),
    [windowStart],
  )

  const employees = users.filter((user) => user.role === 'employee' && user.is_active)

  const calendarLanes = useMemo(() => {
    const baseDate = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate())
    const laneEnds: number[] = []

    return tasks
      .filter((task) => task.starts_at && task.deadline)
      .map((task) => {
        const startDate = toDateOnly(task.starts_at)
        const endDate = toDateOnly(task.deadline)
        if (!startDate || !endDate) return null

        const startIndex = Math.floor((startDate.getTime() - baseDate.getTime()) / DAY_MS)
        const endIndex = Math.floor((endDate.getTime() - baseDate.getTime()) / DAY_MS)
        if (endIndex < 0 || startIndex > VISIBLE_DAYS - 1) return null

        const colStart = Math.max(0, startIndex)
        const colEnd = Math.min(VISIBLE_DAYS - 1, endIndex)
        let row = 0
        while (laneEnds[row] !== undefined && colStart <= laneEnds[row]) row += 1
        laneEnds[row] = colEnd

        return {
          task,
          row,
          colStart: colStart + 1,
          colEnd: colEnd + 2,
        } satisfies CalendarLane
      })
      .filter((lane): lane is CalendarLane => lane !== null)
      .sort((left, right) => left.row - right.row || left.colStart - right.colStart)
  }, [tasks, windowStart])

  const laneCount = Math.max(calendarLanes.length > 0 ? Math.max(...calendarLanes.map((lane) => lane.row + 1)) : 0, 1)

  if (!auth) {
    return (
      <main className="auth-screen" style={{ backgroundImage: `linear-gradient(90deg, rgba(15, 23, 42, 0.82) 0%, rgba(15, 23, 42, 0.54) 32%, rgba(15, 23, 42, 0.18) 58%, rgba(255, 255, 255, 0.02) 100%), url(${yafiImage})` }}>
        <section className="auth-card">
          <header className="auth-card__header">
            <p className="auth-card__eyebrow">Локальная сеть ЯФИ</p>
            <h1>Вход в ЯФИ Task Tracker</h1>
            <p className="auth-card__subtitle">Система управления задачами для администраторов и сотрудников.</p>
          </header>
          <form className="task-form" onSubmit={handleLogin}>
            <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин" required />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" type="password" required />
            <button type="submit">Войти</button>
          </form>
          {error && <p className="message message--error">{error}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard dashboard--single">
      <section className="workspace">
        <section className="calendar-zone">
          <header className="calendar-header">
            <div>
              <h1>Календарь задач</h1>
              <p>
                {visibleDates[0].toLocaleDateString('ru-RU')} - {visibleDates[VISIBLE_DAYS - 1].toLocaleDateString('ru-RU')}
              </p>
            </div>
            <div className="calendar-meta">
              <p className="user-line">
                Пользователь: <b>{me?.login}</b> ({me?.role})
              </p>
              {me?.role === 'admin' && (
                <button type="button" className="menu-btn" onClick={() => setShowAdminPanel((value) => !value)}>
                  {showAdminPanel ? 'Закрыть панель' : 'Admin Panel'}
                </button>
              )}
            </div>
          </header>
          {error && <p className="message message--error">{error}</p>}
          <div className="calendar-scroll">
            <div className="timeline-shell">
              <div className="timeline-header" onWheel={handleCalendarWheel}>
                {visibleDates.map((day) => (
                  <div className="timeline-day" key={day.toISOString()}>
                    <strong>{day.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</strong>
                    <span>{day.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                  </div>
                ))}
              </div>

              <div className="timeline-body" onWheel={handleTimelineBodyWheel}>
                <div className="timeline-board" style={{ gridTemplateRows: `repeat(${laneCount}, minmax(76px, 1fr))` }}>
                  {visibleDates.map((day) => (
                    <div className="timeline-column" key={day.toISOString()} />
                  ))}

                  {calendarLanes.map((lane) => (
                    <button
                      key={lane.task.id}
                      type="button"
                      className={`timeline-task timeline-task--${lane.task.priority} ${selectedTaskId === lane.task.id ? 'timeline-task--selected' : ''}`}
                      style={{
                        gridColumn: `${lane.colStart} / ${lane.colEnd}`,
                        gridRow: `${lane.row + 1}`,
                      }}
                      onClick={() => setSelectedTaskId(lane.task.id)}
                    >
                      <span className={`status-badge status-badge--${lane.task.status}`}>{STATUS_LABELS[lane.task.status]}</span>
                      <span className={`priority-badge priority-badge--${lane.task.priority}`}>{PRIORITY_LABELS[lane.task.priority]}</span>
                      <strong>{lane.task.title}</strong>
                      <span>{formatDateTime(lane.task.starts_at)} {'->'} {formatDateTime(lane.task.deadline)}</span>
                      {lane.task.tags.length > 0 && (
                        <div className="timeline-tags">
                          {lane.task.tags.slice(0, 3).map(tag => {
                            const bgColor = tag.color || generateTagColor(tag.name)
                            const textColor = getTextColorForBackground(bgColor)
                            return (
                              <span key={tag.id} className="tag-chip" style={{ backgroundColor: bgColor, color: textColor, fontSize: '10px', padding: '2px 4px' }}>
                                {tag.name}
                              </span>
                            )
                          })}
                          {lane.task.tags.length > 3 && <span className="tag-chip" style={{ backgroundColor: '#6b7280', color: '#ffffff', fontSize: '10px', padding: '2px 4px' }}>+{lane.task.tags.length - 3}</span>}
                        </div>
                      )}
                    <small>{lane.task.assigned_user_logins.join(', ') || 'Исполнители не назначены'}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="editor-zone">
          {selectedTask ? (
            <div className="task-card">
              <div className="task-card__top">
                <div>
                  <h3>{selectedTask.title}</h3>
                  <p>{selectedTask.description || 'Без описания'}</p>
                </div>
                <span className={`status-badge status-badge--${selectedTask.status}`}>{STATUS_LABELS[selectedTask.status]}</span>
              </div>

              <div className="task-meta">
                <p><b>Начало:</b> {formatDateTime(selectedTask.starts_at)}</p>
                <p><b>Дедлайн:</b> {formatDateTime(selectedTask.deadline)}</p>
                <p><b>Приоритет:</b> {PRIORITY_LABELS[selectedTask.priority]}</p>
                <p><b>Исполнители:</b> {selectedTask.assigned_user_logins.join(', ') || '-'}</p>
                <p><b>Теги:</b> {selectedTask.tags.length > 0 ? (
                  <div className="tag-list">
                    {selectedTask.tags.map(tag => {
                      const bgColor = tag.color || generateTagColor(tag.name)
                      const textColor = getTextColorForBackground(bgColor)
                      return (
                        <span key={tag.id} className="tag-chip" style={{ backgroundColor: bgColor, color: textColor }}>
                          {tag.name}
                        </span>
                      )
                    })}
                  </div>
                ) : '-'}</p>
              </div>

              {me?.role === 'admin' && (
                <form className="task-form editor-form" onSubmit={saveTaskEdits}>
                  <div className="editor-grid">
                    <Field label="Название задачи">
                      <input value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} required />
                    </Field>
                    <Field label="Статус задачи">
                      <select value={editTaskStatus} onChange={(e) => setEditTaskStatus(e.target.value as Task['status'])}>
                        <option value="todo">{STATUS_LABELS.todo}</option>
                        <option value="in_progress">{STATUS_LABELS.in_progress}</option>
                        <option value="review">{STATUS_LABELS.review}</option>
                        <option value="completed">{STATUS_LABELS.completed}</option>
                      </select>
                    </Field>
                    <Field label="Приоритет">
                      <select value={editTaskPriority} onChange={(e) => setEditTaskPriority(e.target.value as Task['priority'])}>
                        <option value="low">{PRIORITY_LABELS.low}</option>
                        <option value="medium">{PRIORITY_LABELS.medium}</option>
                        <option value="high">{PRIORITY_LABELS.high}</option>
                      </select>
                    </Field>
                    <Field label="Дата и время начала">
                      <input value={editTaskStartsAt} onChange={(e) => setEditTaskStartsAt(e.target.value)} type="datetime-local" required />
                    </Field>
                    <Field label="Дедлайн">
                      <input value={editTaskDeadline} onChange={(e) => setEditTaskDeadline(e.target.value)} type="datetime-local" required />
                    </Field>
                    <Field label="Исполнитель">
                      <select
                        value=""
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          if (value) toggleAssignee(value, setEditTaskAssigneeIds)
                        }}
                      >
                        <option value="">Добавить исполнителя</option>
                        {employees.map((user) => (
                          <option key={user.id} value={user.id}>{user.login}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Описание">
                      <input value={editTaskDescription} onChange={(e) => setEditTaskDescription(e.target.value)} />
                    </Field>
                  </div>

                  {employees.length > 0 && (
                    <div className="employee-list">
                      <span className="employee-list__label">Список сотрудников</span>
                      <div className="employee-list__items">
                        {employees.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            className={`employee-chip ${editTaskAssigneeIds.includes(user.id) ? 'employee-chip--active' : ''}`}
                            onClick={() => toggleAssignee(user.id, setEditTaskAssigneeIds)}
                          >
                            {user.login}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {editTaskAssigneeIds.length > 0 && (
                    <div className="selected-assignees">
                      {employees
                        .filter((user) => editTaskAssigneeIds.includes(user.id))
                        .map((user) => (
                          <button key={user.id} type="button" className="selected-assignee" onClick={() => toggleAssignee(user.id, setEditTaskAssigneeIds)}>
                            {user.login} ×
                          </button>
                        ))}
                    </div>
                  )}

                  {tags.length > 0 && (
                    <div className="tag-list">
                      <span className="tag-list__label">Теги</span>
                      <div className="tag-list__items">
                        {tags.map((tag) => {
                          const isActive = editTaskTagNames.includes(tag.name)
                          const bgColor = isActive ? (tag.color || generateTagColor(tag.name)) : '#e5e7eb'
                          const textColor = isActive ? getTextColorForBackground(bgColor) : '#000000'
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              className={`tag-chip ${isActive ? 'tag-chip--active' : ''}`}
                              style={{ backgroundColor: bgColor, color: textColor }}
                              onClick={() => setEditTaskTagNames((prev) => 
                                prev.includes(tag.name) 
                                  ? prev.filter((name) => name !== tag.name) 
                                  : [...prev, tag.name]
                              )}
                            >
                              {tag.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="editor-actions">
                    <button type="submit">Сохранить изменения</button>
                    <button type="button" className="danger" onClick={() => void deleteTask(selectedTask.id)}>Удалить задачу</button>
                  </div>
                </form>
              )}

              {me?.role === 'employee' && (
                <div className="task-actions">
                  <button type="button" onClick={() => void updateTaskStatus(selectedTask, 'in_progress')}>В работу</button>
                  <button type="button" onClick={() => void updateTaskStatus(selectedTask, 'completed')}>Выполнена</button>
                </div>
              )}

              <h4>Комментарии</h4>
              <ul className="comments-list">
                {selectedTask.comments.map((comment) => (
                  <li key={comment.id}>{comment.text}</li>
                ))}
              </ul>
              <form className="task-form compact" onSubmit={addComment}>
                <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Комментарий" />
                <button type="submit">Добавить</button>
              </form>
            </div>
          ) : (
            <section className="task-card task-card--empty">
              <h3>Редактор задачи</h3>
              <p>Выберите задачу на календаре, чтобы увидеть детали и изменить её.</p>
            </section>
          )}
        </section>
      </section>

      {me?.role === 'admin' && showAdminPanel && <div className="drawer-backdrop" onClick={() => setShowAdminPanel(false)} />}
      {me?.role === 'admin' && (
        <aside className={`side-panel side-panel--drawer ${showAdminPanel ? 'side-panel--open' : ''}`}>
          {error && <p className="message message--error">{error}</p>}
          {isLoading && !me && <p className="message">Загрузка...</p>}

          <button type="button" className="menu-btn" onClick={() => setShowCreateUser((value) => !value)}>
            Создать пользователя
          </button>
          {showCreateUser && (
            <form className="task-form compact" onSubmit={createUser}>
              <Field label="Имя пользователя">
                <input value={newUserLogin} onChange={(e) => setNewUserLogin(e.target.value)} placeholder="Например, ivanov" required />
              </Field>
              <Field label="Пароль">
                <input value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Введите пароль" required type="password" />
              </Field>
              <Field label="Роль">
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'employee')}>
                  <option value="employee">Сотрудник</option>
                  <option value="admin">Администратор</option>
                </select>
              </Field>
              <button type="submit">Сохранить</button>
            </form>
          )}

          <button type="button" className="menu-btn" onClick={() => setShowCreateTask((value) => !value)}>
            Создать задачу
          </button>
          {showCreateTask && (
            <form className="task-form compact" onSubmit={handleSubmit}>
              <Field label="Название задачи">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, Подготовить отчёт" required />
              </Field>
              <Field label="Описание">
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Краткое описание задачи" />
              </Field>
              <Field label="Дата и время начала">
                <input value={taskStartsAt} onChange={(e) => setTaskStartsAt(e.target.value)} type="datetime-local" required />
              </Field>
              <Field label="Дедлайн">
                <input value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} type="datetime-local" required />
              </Field>
              <Field label="Приоритет">
                <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as Task['priority'])}>
                  <option value="low">{PRIORITY_LABELS.low}</option>
                  <option value="medium">{PRIORITY_LABELS.medium}</option>
                  <option value="high">{PRIORITY_LABELS.high}</option>
                </select>
              </Field>
              <Field label="Исполнитель">
                <select
                  value=""
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    if (value) toggleAssignee(value, setTaskAssigneeIds)
                  }}
                >
                  <option value="">Добавить исполнителя</option>
                  {employees.map((user) => (
                    <option value={user.id} key={user.id}>{user.login}</option>
                  ))}
                </select>
              </Field>
              {employees.length > 0 && (
                <div className="employee-list">
                  <span className="employee-list__label">Список сотрудников</span>
                  <div className="employee-list__items">
                    {employees.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className={`employee-chip ${taskAssigneeIds.includes(user.id) ? 'employee-chip--active' : ''}`}
                        onClick={() => toggleAssignee(user.id, setTaskAssigneeIds)}
                      >
                        {user.login}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {taskAssigneeIds.length > 0 && (
                <div className="selected-assignees">
                  {employees
                    .filter((user) => taskAssigneeIds.includes(user.id))
                    .map((user) => (
                      <button key={user.id} type="button" className="selected-assignee" onClick={() => toggleAssignee(user.id, setTaskAssigneeIds)}>
                        {user.login} ×
                      </button>
                    ))}
                </div>
              )}
              <button type="button" className="secondary-btn" onClick={() => setShowCreateUser(true)}>
                Добавить нового исполнителя
              </button>
              <div className="helper-text">
                Задача теперь может длиться несколько дней. Укажите начало и дедлайн, и она растянется по календарю.
              </div>
              <div className="tag-select-list">
                {tags.map((tag) => (
                  <label key={tag.id}>
                    <input
                      type="checkbox"
                      checked={taskTagNames.includes(tag.name)}
                      onChange={(e) =>
                        setTaskTagNames((prev) => (e.target.checked ? [...prev, tag.name] : prev.filter((name) => name !== tag.name)))
                      }
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
              <button type="submit">Сохранить</button>
            </form>
          )}

          <button type="button" className="menu-btn" onClick={() => setShowTagsMenu((value) => !value)}>
            Список тегов
          </button>
          {showTagsMenu && (
            <section className="tags-panel">
              <form className="task-form compact" onSubmit={createTag}>
                <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Новый тег" />
                <button type="submit">Добавить</button>
              </form>
              <ul className="tag-list">
                {tags.map((tag) => (
                  <li key={tag.id}>
                    {editingTagId === tag.id ? (
                      <>
                        <input value={editingTagName} onChange={(e) => setEditingTagName(e.target.value)} />
                        <button type="button" onClick={() => void updateTag(tag.id)}>OK</button>
                      </>
                    ) : (
                      <>
                        <span style={{ backgroundColor: tag.color, padding: '2px 4px', borderRadius: '4px', color: getTextColorForBackground(tag.color) }}>{tag.name}</span>
                        <button type="button" onClick={() => { setEditingTagId(tag.id); setEditingTagName(tag.name) }}>✎</button>
                      </>
                    )}
                    <button type="button" onClick={() => void deleteTag(tag.id)}>🗑</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      )}
    </main>
  )
}

export default App
