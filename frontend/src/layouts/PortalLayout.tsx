import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAccount, useDisconnect } from 'wagmi'
import { useDemoStore, type Role } from '../store/demoStore'
import { truncateAddress } from '../lib/format'
import {
  ShieldCheck, Wallet, LogOut, LayoutDashboard, FileText, CheckCircle,
  AlertTriangle, Search, Map, Award, List, FileKey, Home, Building2,
  HardHat, Users, Shield, PanelLeftClose, PanelLeft
} from 'lucide-react'
import { useUIStore } from '../store/uiStore'

const roleConfig: Record<Role, { label: string; color: string; icon: typeof Building2 }> = {
  gov: { label: 'Government', color: 'var(--gov)', icon: Building2 },
  contractor: { label: 'Contractor', color: 'var(--contractor)', icon: HardHat },
  public: { label: 'Public', color: 'var(--public)', icon: Users },
  auditor: { label: 'Auditor', color: 'var(--auditor)', icon: Shield },
}

const navItems: Record<Role, { path: string; label: string; icon: typeof LayoutDashboard }[]> = {
  gov: [
    { path: '/gov', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/gov/tenders/create', label: 'Create Tender', icon: FileText },
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
  ],
}

export default function PortalLayout({ role }: { role: Role }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { isDemoMode, demoRole, clearDemo } = useDemoStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  const activeRole = isDemoMode ? (demoRole || role) : role
  const rc = roleConfig[activeRole]
  const Icon = rc.icon

  const handleLogout = () => {
    if (isDemoMode) clearDemo()
    else disconnect()
    navigate('/')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarCollapsed ? 64 : 256,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width var(--duration-normal) var(--ease-out)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{ padding: sidebarCollapsed ? '16px 12px' : '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 64 }}>
          <button onClick={() => navigate('/')} style={{ background: 'var(--gov)', width: 32, height: 32, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            <ShieldCheck size={16} color="#fff" />
          </button>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
                <span style={{ color: 'var(--gov)' }}>Gov</span>Chain
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>ZKP Tender Protocol</div>
            </div>
          )}
        </div>

        {/* Role badge */}
        {!sidebarCollapsed && (
          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: `1px solid ${rc.color}30`, background: `${rc.color}08` }}>
              <Icon size={15} style={{ color: rc.color }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: rc.color }}>{rc.label} Portal</span>
              {isDemoMode && <span style={{ fontSize: 9, color: 'var(--warning)', marginLeft: 'auto', fontWeight: 700 }}>DEMO</span>}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: sidebarCollapsed ? '8px 6px' : '4px 12px', overflowY: 'auto' }}>
          {navItems[activeRole].map(item => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: sidebarCollapsed ? '10px 0' : '9px 12px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  marginBottom: 2,
                  transition: 'all var(--duration-fast)',
                  background: isActive ? rc.color : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                }}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon size={16} />
                {!sidebarCollapsed && item.label}
              </button>
            )
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: sidebarCollapsed ? '8px 6px' : '12px 16px', borderTop: '1px solid var(--border)' }}>
          {/* Wallet / Demo indicator */}
          {!sidebarCollapsed && isConnected && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{truncateAddress(address)}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Sepolia Testnet</div>
            </div>
          )}

          {/* Collapse toggle */}
          <button onClick={toggleSidebar} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)', marginBottom: 6 }}>
            {sidebarCollapsed ? <PanelLeft size={14} /> : <><PanelLeftClose size={14} /> Collapse</>}
          </button>

          {/* Logout */}
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
            {sidebarCollapsed ? <LogOut size={14} /> : <><Home size={13} /> Sign Out</>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{ height: 56, borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{rc.label} Portal</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isConnected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '4px 12px' }}>
                <Wallet size={13} color="var(--gov)" />
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{truncateAddress(address)}</span>
              </div>
            )}
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
            </div>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
