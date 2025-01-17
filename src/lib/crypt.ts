import { v4 as uuidv4 } from 'uuid'

export function getSessionId() {
  const existing = localStorage.getItem('session_id')
  if (existing) {
    return existing.replace(/[^a-z0-9-]/g, '')
  }
  const newSessionId = uuidv4()
  localStorage.setItem('session_id', newSessionId)
  return newSessionId
}
