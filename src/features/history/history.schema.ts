import { z } from 'zod'

export const historyStatusSchema = z.enum(['pending', 'running', 'success', 'failed', 'partial'])
