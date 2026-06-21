import { db } from './db'
import type { AssetRecord } from '../types/api'

export async function putAsset(asset: AssetRecord) {
  return db.assets.put(asset)
}

export async function getAsset(id: string) {
  return db.assets.get(id)
}

export async function deleteAssets(ids: string[]) {
  if (ids.length === 0) return
  await db.assets.bulkDelete(ids)
}

export async function clearUnreferencedAssets(referencedAssetIds: Iterable<string>) {
  const referenced = new Set(referencedAssetIds)
  const assets = await db.assets.toArray()
  const orphanIds = assets.map((asset) => asset.id).filter((id) => !referenced.has(id))
  await deleteAssets(orphanIds)
  return orphanIds.length
}

export async function clearAssets() {
  return db.assets.clear()
}
