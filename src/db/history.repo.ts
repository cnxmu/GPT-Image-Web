import { db } from './db'
import type { HistoryRecord } from '../types/history'
import { deleteAssets } from './assets.repo'

export async function upsertHistory(record: HistoryRecord) {
  return db.history.put(record)
}

export async function deleteHistory(id: string) {
  const record = await db.history.get(id)
  if (record) await deleteAssets(getHistoryAssetIds([record]))
  return db.history.delete(id)
}

export async function clearHistory() {
  const records = await db.history.toArray()
  await deleteAssets(getHistoryAssetIds(records))
  return db.history.clear()
}

export async function pruneHistoryToLimit(limit: number) {
  const safeLimit = Math.max(0, Math.floor(limit))
  const records = await db.history.orderBy('startedAt').reverse().toArray()
  const removedRecords = records.slice(safeLimit)
  if (removedRecords.length === 0) return 0

  await deleteAssets(getHistoryAssetIds(removedRecords))
  await db.history.bulkDelete(removedRecords.map((record) => record.id))
  return removedRecords.length
}

export function getHistoryAssetIds(records: HistoryRecord[]) {
  return Array.from(
    new Set(
      records.flatMap((record) => [
        ...(record.referenceImages?.map((item) => item.assetId) || []),
        ...record.results.map((item) => item.localAssetId).filter((id): id is string => Boolean(id)),
      ]),
    ),
  )
}
