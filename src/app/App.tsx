import { AppShell } from '../components/layout/AppShell'
import { useRestoreRunningHistory } from '../features/image/useGenerateImages'

export default function App() {
  useRestoreRunningHistory()

  return <AppShell />
}
