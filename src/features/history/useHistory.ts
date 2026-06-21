import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'

export function useHistory() {
  return useLiveQuery(() => db.history.orderBy('startedAt').reverse().limit(80).toArray(), [], [])
}
