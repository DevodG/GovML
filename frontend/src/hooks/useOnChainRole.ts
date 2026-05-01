import { useReadContracts, useAccount } from 'wagmi'
import {
  contractAddresses, isDemoMode,
  TenderRegistryABI, AnomalyOracleABI, ZKPControllerABI,
  ROLE_HASHES,
} from '../config/contracts'

type OnChainRole = 'government' | 'contractor' | 'auditor' | 'public'

interface UseOnChainRoleResult {
  role: OnChainRole
  isKYCVerified: boolean
  isLoading: boolean
  isError: boolean
}

/**
 * Resolves the connected wallet's on-chain role by querying AccessControl.hasRole()
 * on TenderRegistry (GOVT_ROLE) and AnomalyOracle (AUDITOR_ROLE), plus KYC status.
 *
 * Falls back to the backend-assigned role when in demo mode.
 */
export function useOnChainRole(backendRole?: string): UseOnChainRoleResult {
  const { address, isConnected } = useAccount()

  const demo = isDemoMode()

  const { data, isLoading, isError } = useReadContracts({
    contracts: [
      {
        address: contractAddresses.tenderRegistry,
        abi: TenderRegistryABI,
        functionName: 'hasRole',
        args: [ROLE_HASHES.GOVT_ROLE, address!],
      },
      {
        address: contractAddresses.anomalyOracle,
        abi: AnomalyOracleABI,
        functionName: 'hasRole',
        args: [ROLE_HASHES.AUDITOR_ROLE, address!],
      },
      {
        address: contractAddresses.zkpController,
        abi: ZKPControllerABI,
        functionName: 'isKYCVerified',
        args: [address!],
      },
    ],
    query: {
      enabled: isConnected && !!address && !demo,
    },
  })

  // Demo mode — use backend role or default to public
  if (demo || !isConnected || !address) {
    return {
      role: (backendRole as OnChainRole) || 'public',
      isKYCVerified: false,
      isLoading: false,
      isError: false,
    }
  }

  if (isLoading || !data) {
    return { role: (backendRole as OnChainRole) || 'public', isKYCVerified: false, isLoading: true, isError: false }
  }

  const isGovt = data[0]?.result === true
  const isAuditor = data[1]?.result === true
  const isKYCVerified = data[2]?.result === true

  let role: OnChainRole = 'public'
  if (isGovt) role = 'government'
  else if (isAuditor) role = 'auditor'
  else if (isKYCVerified) role = 'contractor'

  return { role, isKYCVerified, isLoading: false, isError }
}
