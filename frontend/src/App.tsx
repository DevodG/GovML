import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useDemoStore } from './store/demoStore'
import Home from './pages/Home'

// Layouts
import PortalLayout from './layouts/PortalLayout'

// Gov pages
import GovDashboard from './pages/gov/Dashboard'

// Contractor pages
import BrowseTenders from './pages/contractor/BrowseTenders'

// Public pages
import TenderFeed from './pages/public/TenderFeed'

// Auditor pages
import AuditorDashboard from './pages/auditor/Dashboard'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isConnected } = useAccount()
  const { isDemoMode, demoRole } = useDemoStore()

  const hasAccess = isDemoMode
    ? demoRole && (!allowedRoles || allowedRoles.includes(demoRole))
    : isConnected

  if (!hasAccess) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Government */}
        <Route path="/gov" element={<ProtectedRoute allowedRoles={['gov']}><PortalLayout role="gov" /></ProtectedRoute>}>
          <Route index element={<GovDashboard />} />
        </Route>

        {/* Contractor */}
        <Route path="/contractor" element={<ProtectedRoute allowedRoles={['contractor']}><PortalLayout role="contractor" /></ProtectedRoute>}>
          <Route index element={<BrowseTenders />} />
        </Route>

        {/* Public */}
        <Route path="/public" element={<PortalLayout role="public" />}>
          <Route index element={<TenderFeed />} />
        </Route>

        {/* Auditor */}
        <Route path="/auditor" element={<ProtectedRoute allowedRoles={['auditor']}><PortalLayout role="auditor" /></ProtectedRoute>}>
          <Route index element={<AuditorDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
