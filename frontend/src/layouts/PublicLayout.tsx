import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/shared/Sidebar'
import { TopBar } from '../components/shared/TopBar'

export default function PublicLayout() {
  return (
    <div className="flex h-screen bg-[#0A0C10] text-[#E8EDF5]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Public Transparency Portal" />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
