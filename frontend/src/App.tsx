import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useAccount } from 'wagmi'
import { useOnChainRole } from './hooks/useOnChainRole'

// Home
import Home from './pages/Home'

// Layouts
import GovLayout from './layouts/GovLayout'
import ContractorLayout from './layouts/ContractorLayout'
import PublicLayout from './layouts/PublicLayout'
import AuditorLayout from './layouts/AuditorLayout'

// Government pages
import GovDashboard from './pages/gov/Dashboard'
import CreateTender from './pages/gov/CreateTender'
import ManageBids from './pages/gov/ManageBids'
import MilestoneApprovals from './pages/gov/MilestoneApprovals'
import AnomalyApprovals from './pages/gov/AnomalyApprovals'

// Contractor pages
import ContractorKYC from './pages/contractor/KYC'
import BrowseTenders from './pages/contractor/BrowseTenders'
import BidSubmission from './pages/contractor/BidSubmission'
import MyBids from './pages/contractor/MyBids'
import MilestoneSubmit from './pages/contractor/MilestoneSubmit'
import Reputation from './pages/contractor/Reputation'

// Public pages
import TenderFeed from './pages/public/TenderFeed'
import FundMap from './pages/public/FundMap'
import ContractorSearch from './pages/public/ContractorSearch'
import BountyHunter from './pages/public/BountyHunter'
import Leaderboard from './pages/public/Leaderboard'

// Auditor pages
import AuditDashboard from './pages/auditor/Dashboard'
import BidAnalysis from './pages/auditor/BidAnalysis'
import ReportViewer from './pages/auditor/ReportViewer'
import FlagReport from './pages/auditor/FlagReport'
import OracleSigning from './pages/auditor/OracleSigning'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { isLoggedIn, user } = useAuthStore()
  const { isConnected } = useAccount()

  // Must be either wallet-connected + SIWE'd, or demo-logged-in
  if (!isLoggedIn) {
    return <Navigate to="/" replace />
  }

  // Check role from auth store (set by SIWE response or on-chain resolution)
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function ProtectedRedirect() {
  const { isLoggedIn, user } = useAuthStore()

  if (!isLoggedIn) {
    return <Navigate to="/" replace />
  }

  const roleMap: Record<string, string> = {
    government: 'gov',
    contractor: 'contractor',
    auditor: 'auditor',
    public: 'public'
  }

  const redirectPath = user ? `/${roleMap[user.role] || 'public'}` : '/public'
  return <Navigate to={redirectPath} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home / landing */}
        <Route path="/" element={<Home />} />

        {/* Government */}
        <Route path="/gov" element={
          <ProtectedRoute allowedRoles={['government']}>
            <GovLayout />
          </ProtectedRoute>
        }>
          <Route index element={<GovDashboard />} />
          <Route path="tenders/create" element={<CreateTender />} />
          <Route path="tenders/:id/bids" element={<ManageBids />} />
          <Route path="milestones" element={<MilestoneApprovals />} />
          <Route path="anomalies" element={<AnomalyApprovals />} />
        </Route>

        {/* Contractor */}
        <Route path="/contractor" element={
          <ProtectedRoute allowedRoles={['contractor']}>
            <ContractorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<BrowseTenders />} />
          <Route path="kyc" element={<ContractorKYC />} />
          <Route path="bid/:tenderId" element={<BidSubmission />} />
          <Route path="my-bids" element={<MyBids />} />
          <Route path="milestones" element={<MilestoneSubmit />} />
          <Route path="reputation" element={<Reputation />} />
        </Route>

        {/* Public — accessible without wallet for browsing */}
        <Route path="/public" element={<PublicLayout />}>
          <Route index element={<TenderFeed />} />
          <Route path="map" element={<FundMap />} />
          <Route path="contractors" element={<ContractorSearch />} />
          <Route path="bounty" element={<BountyHunter />} />
          <Route path="leaderboard" element={<Leaderboard />} />
        </Route>

        {/* Auditor */}
        <Route path="/auditor" element={
          <ProtectedRoute allowedRoles={['auditor']}>
            <AuditorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AuditDashboard />} />
          <Route path="bids" element={<BidAnalysis />} />
          <Route path="reports/:id" element={<ReportViewer />} />
          <Route path="flag" element={<FlagReport />} />
          <Route path="sign" element={<OracleSigning />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<ProtectedRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
