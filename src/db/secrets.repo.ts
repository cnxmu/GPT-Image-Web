import { db } from './db'
import type { SecretRecord } from '../types/api'

export async function getSecret(id: SecretRecord['id']) {
  return db.secrets.get(id)
}

export async function setSecret(id: SecretRecord['id'], value: string) {
  return db.secrets.put({
    id,
    value,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteSecret(id: SecretRecord['id']) {
  return db.secrets.delete(id)
}

export async function clearSecrets() {
  return db.secrets.clear()
}
