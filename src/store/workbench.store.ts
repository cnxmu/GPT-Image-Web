import { create } from 'zustand'
import { createFormSlice, type FormSlice } from './form.slice'
import { createQueueSlice, type QueueSlice } from './queue.slice'
import { createBatchSlice, type BatchSlice } from './batch.slice'

export interface WorkbenchState extends FormSlice, QueueSlice, BatchSlice {}

export const useWorkbenchStore = create<WorkbenchState>()((...args) => ({
  ...createFormSlice(...args),
  ...createQueueSlice(...args),
  ...createBatchSlice(...args),
}))
