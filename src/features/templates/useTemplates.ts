import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { mergeSystemTemplates } from './system-templates'

export function useTemplates() {
  const userTemplates = useLiveQuery(() => db.templates.orderBy('updatedAt').reverse().toArray(), [], [])
  return mergeSystemTemplates(userTemplates)
}
