import { useAuthStore } from '../../store/authStore'
import { User } from 'lucide-react'

interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  const { username } = useAuthStore()

  return (
    <header className="h-16 border-b border-[#1E2530] bg-[#0A0C10] flex items-center justify-between px-8">
      <h2 className="text-lg font-semibold text-[#E8EDF5] tracking-tight">{title}</h2>
      <div className="flex items-center gap-3">
        {username && (
          <div className="flex items-center gap-2 bg-[#151A22] border border-[#1E2530] rounded-full px-3 py-1.5">
            <User size={14} className="text-[#3B8BD4]" />
            <span className="text-xs font-semibold text-[#E8EDF5]">{username}</span>
          </div>
        )}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#151A22] border border-[#1E2530]">
          <div className="h-2 w-2 rounded-full bg-[#1D9E75]" />
        </div>
      </div>
    </header>
  )
}
