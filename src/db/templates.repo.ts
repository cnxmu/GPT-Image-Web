import { db } from './db'
import type { TemplateRecord } from '../types/template'

export async function upsertTemplate(template: TemplateRecord) {
  return db.templates.put(template)
}

export async function deleteTemplate(id: string) {
  return db.templates.delete(id)
}

export async function clearTemplates() {
  return db.templates.clear()
}
