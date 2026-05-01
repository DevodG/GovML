import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { truncateAddress } from '../../lib/format'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import {
  ShieldCheck, Wallet, LogOut, LayoutDashboard, FileText, CheckCircle,
  AlertTriangle, Search, Map, Award, List, FileKey, Home, User, Building2, HardHat, Users, Shield
} from 'lucide-react'

const roleConfig: Record<string, { label: string; color: string; icon: any }> = {
  gov: { label: 'Government Portal', color: '#3B8BD4', icon: Building2 },
  contractor: { label: 'Contractor Portal', color: '#1D9E75', icon: HardHat },
  public: { label: 'Public Portal', color: '#EF9F27', icon: Users },
  auditor: { label: 'Auditor Portal', color: '#7F77DD', icon: Shield },
}

export function Sidebar() {
  const { role, username, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  const handleLogout = () => { logout(); navigate('/') }
  const rc = roleConfig[role]

  const navItems: Record<string, { path: string; label: string; icon: any }[]> = {
    gov: [
      { path: '/gov', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/gov/tenders/create', label: 'Create Tender', icon: FileText },
      { path: '/gov/tenders/1/bids', label: 'Manage Bids', icon: Users },
      { path: '/gov/milestones', label: 'Milestones', icon: CheckCircle },
      { path: '/gov/anomalies', label: 'Anomalies', icon: AlertTriangle },
    ],
    contractor: [
      { path: '/contractor', label: 'Browse Tenders', icon: Search },
      { path: '/contractor/kyc', label: 'KYC & ZKP', icon: FileKey },
      { path: '/contractor/my-bids', label: 'My Bids', icon: FileText },
      { path: '/contractor/milestones', label: 'Milestones', icon: CheckCircle },
      { path: '/contractor/reputation', label: 'Reputation', icon: Award },
    ],
    public: [
      { path: '/public', label: 'Tender Feed', icon: List },
      { path: '/public/map', label: 'Fund Map', icon: Map },
      { path: '/public/contractors', label: 'Contractors', icon: Users },
      { path: '/public/bounty', label: 'Bounty Hunter', icon: ShieldCheck },
      { path: '/public/leaderboard', label: 'Leaderboard', icon: Award },
    ],
    auditor: [
      { path: '/auditor', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/auditor/bids', label: 'Bid Analysis', icon: Search },
      { path: '/auditor/flag', label: 'Flag Anomaly', icon: AlertTriangle },
      { path: '/auditor/sign', label: 'Oracle Sign', icon: CheckCircle },
    ]
  }

  return (
    <div className="w-64 bg-[#0F1318] border-r border-[#1E2530] flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-[#1E2530]">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity w-full text-left">
          <div className="w-8 h-8 rounded-lg bg-[#3B8BD4] flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-[#E8EDF5] tracking-tight leading-none"><span className="text-[#3B8BD4]">Gov</span>Chain</div>
            <div className="text-xs text-[#4A5568] mt-0.5">ZKP Tender Protocol</div>
          </div>
        </button>
      </div>

      {/* User + Role badge */}
      <div className="px-4 pt-4 space-y-2">
        {/* User info */}
        {username && (
          <div className="flex items-center gap-2 bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${rc.color}20` }}>
              <User size={14} style={{ color: rc.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#E8EDF5] truncate">{username}</div>
              <div className="text-xs text-[#4A5568]">{rc.label}</div>
            </div>
          </div>
        )}
        {/* Role indicator */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: `${rc.color}30`, background: `${rc.color}08` }}>
          <rc.icon size={16} style={{ color: rc.color }} />
          <span className="text-xs font-semibold" style={{ color: rc.color }}>{rc.label}</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto py-3">
        {(navItems[role] || []).map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                isActive ? 'text-white shadow-sm' : 'text-[#8B95A8] hover:bg-[#151A22] hover:text-[#E8EDF5]'
              }`}
              style={isActive ? { background: rc.color } : {}}>
              <item.icon size={16} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-[#1E2530] space-y-2">
        {isConnected ? (
          <div className="bg-[#151A22] border border-[#1E2530] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1D9E75]" />
                <span className="text-xs font-mono text-[#E8EDF5]">{truncateAddress(address)}</span>
              </div>
              <button onClick={() => disconnect()} className="text-[#4A5568] hover:text-[#8B95A8]"><LogOut size={14} /></button>
            </div>
            <div className="text-xs text-[#4A5568] mt-1">Mumbai Testnet</div>
          </div>
        ) : (
          <button onClick={() => connect({ connector: injected() })}
            className="w-full bg-[#151A22] border border-[#1E2530] hover:border-[#3B8BD4]/40 text-[#8B95A8] hover:text-[#E8EDF5] font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
            <Wallet size={15} />Connect Wallet
          </button>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-[#1E2530] text-[#4A5568] hover:text-[#D85A30] hover:border-[#D85A30]/30 transition-all text-xs font-medium">
          <Home size={13} />Sign Out
        </button>
      </div>
    </div>
  )
}
