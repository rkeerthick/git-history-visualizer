import { useRepoStore } from '@/store/repoStore'
import { RepoImport } from '@/components/RepoImport'
import { MainLayout } from '@/components/layout/MainLayout'

function App() {
  const repoPath = useRepoStore(s => s.repoPath)

  if (!repoPath) {
    return <RepoImport />
  }

  return <MainLayout />
}

export default App
