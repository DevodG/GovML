import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useDemoStore } from './store/demoStore'
import Home from './pages/Home'

// Layouts
import PortalLayout from './layouts/PortalLayout'

// Gov pages
import GovDashboard from './pages/gov/Dashboard'
import CreateTender from './pages/gov/CreateTender'
import Tenders from './pages/gov/Tenders'
import TenderDetail from './pages/gov/TenderDetail'
import GovMilestones from './pages/gov/Milestones'
import GovAnomalies from './pages/gov/Anomalies'

// Contractor pages
import BrowseTenders from './pages/contractor/BrowseTenders'
import ContractorTenderDetail from './pages/contractor/TenderDetail'
import MyBids from './pages/contractor/MyBids'
import KYC from './pages/contractor/KYC'
import ContractorMilestones from './pages/contractor/Milestones'
import Reputation from './pages/contractor/Reputation'

// Public pages
import TenderFeed from './pages/public/TenderFeed'
import FundMap from './pages/public/FundMap'
import Contractors from './pages/public/Contractors'
import ContractorProfile from './pages/public/ContractorProfile'
import BountyHunter from './pages/public/BountyHunter'
import Leaderboard from './pages/public/Leaderboard'
import PublicTenderDetail from './pages/public/PublicTenderDetail'

// Auditor pages
import AuditorDashboard from './pages/auditor/Dashboard'
import AuditorAnomalies from './pages/auditor/Anomalies'
import FlagAnomaly from './pages/auditor/FlagAnomaly'
import AIReport from './pages/auditor/AIReport'
import ReviewAnomaly from './pages/auditor/ReviewAnomaly'
import BidAnalysis from './pages/auditor/BidAnalysis'
import OracleSign from './pages/auditor/OracleSign'
import AuditorReports from './pages/auditor/Reports'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isConnected } = useAccount()
  const { isDemoMode, demoRole } = useDemoStore()

  // Always require demo mode with a role set
  // This ensures users explicitly choose their role
  const hasAccess = isDemoMode && demoRole && (!allowedRoles || allowedRoles.includes(demoRole))

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
          <Route path="create" element={<CreateTender />} />
          <Route path="tenders" element={<Tenders />} />
          <Route path="tenders/:id" element={<TenderDetail />} />
          <Route path="milestones" element={<GovMilestones />} />
          <Route path="anomalies" element={<GovAnomalies />} />
        </Route>

        {/* Contractor */}
        <Route path="/contractor" element={<ProtectedRoute allowedRoles={['contractor']}><PortalLayout role="contractor" /></ProtectedRoute>}>
          <Route index element={<BrowseTenders />} />
          <Route path="tenders/:id" element={<ContractorTenderDetail />} />
          <Route path="bids" element={<MyBids />} />
          <Route path="kyc" element={<KYC />} />
          <Route path="milestones" element={<ContractorMilestones />} />
          <Route path="reputation" element={<Reputation />} />
        </Route>

        {/* Public */}
        <Route path="/public" element={<PortalLayout role="public" />}>
          <Route index element={<TenderFeed />} />
          <Route path="tenders/:id" element={<PublicTenderDetail />} />
          <Route path="map" element={<FundMap />} />
          <Route path="contractors" element={<Contractors />} />
          <Route path="contractors/:id" element={<ContractorProfile />} />
          <Route path="bounty" element={<BountyHunter />} />
          <Route path="leaderboard" element={<Leaderboard />} />
        </Route>

        {/* Auditor */}
        <Route path="/auditor" element={<ProtectedRoute allowedRoles={['auditor']}><PortalLayout role="auditor" /></ProtectedRoute>}>
          <Route index element={<AuditorDashboard />} />
          <Route path="anomalies" element={<AuditorAnomalies />} />
          <Route path="flag" element={<FlagAnomaly />} />
          <Route path="reports" element={<AuditorReports />} />
          <Route path="reports/:id" element={<AIReport />} />
          <Route path="anomalies/:id" element={<ReviewAnomaly />} />
          <Route path="bids" element={<BidAnalysis />} />
          <Route path="sign" element={<OracleSign />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
