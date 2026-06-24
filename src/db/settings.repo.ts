import {
  DEFAULT_AGENT_MODEL,
  DEFAULT_GENERATION_CONCURRENCY,
  DEFAULT_NANO_BANANA_DETAILED_MODELS_ENABLED,
  MAX_GENERATION_CONCURRENCY,
  MIN_GENERATION_CONCURRENCY,
  isAgentModel,
  type AgentModel,
} from '../lib/constants'
import { db } from './db'

export async function getAgentModel(): Promise<AgentModel> {
  const record = await db.settings.get('agentModel')
  return typeof record?.value === 'string' && isAgentModel(record.value) ? record.value : DEFAULT_AGENT_MODEL
}

export async function setAgentModel(value: AgentModel) {
  return db.settings.put({
    id: 'agentModel',
    value,
    updatedAt: new Date().toISOString(),
  })
}

export function clampGenerationConcurrency(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return DEFAULT_GENERATION_CONCURRENCY
  return Math.max(MIN_GENERATION_CONCURRENCY, Math.min(MAX_GENERATION_CONCURRENCY, Math.round(numeric)))
}

export async function getGenerationConcurrency() {
  const record = await db.settings.get('generationConcurrency')
  return clampGenerationConcurrency(record?.value)
}

export async function setGenerationConcurrency(value: number) {
  return db.settings.put({
    id: 'generationConcurrency',
    value: clampGenerationConcurrency(value),
    updatedAt: new Date().toISOString(),
  })
}

export function normalizeNanoBananaDetailedModelsEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : DEFAULT_NANO_BANANA_DETAILED_MODELS_ENABLED
}

export async function getNanoBananaDetailedModelsEnabled() {
  const record = await db.settings.get('nanoBananaDetailedModelsEnabled')
  return normalizeNanoBananaDetailedModelsEnabled(record?.value)
}

export async function setNanoBananaDetailedModelsEnabled(value: boolean) {
  return db.settings.put({
    id: 'nanoBananaDetailedModelsEnabled',
    value,
    updatedAt: new Date().toISOString(),
  })
}
