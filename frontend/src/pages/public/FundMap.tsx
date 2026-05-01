import { useState, useEffect } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { Card } from '../../components/ui'
import { formatINR } from '../../lib/format'
import api from '../../lib/api'

// Using a reliable source for India GeoJSON
const GEO_URL = 'https://raw.githubusercontent.com/geohacker/india/master/state/india_telengana.geojson'

export default function FundMap() {
  const [selected, setSelected] = useState<string | null>(null)
  const [stateData, setStateData] = useState<Record<string, { tenders: number; allocated: number; utilised: number }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFundMap = async () => {
      try {
        const response = await api.public.getFundMap()
        setStateData(response.stateData || {})
      } catch (error) {
        console.error('Failed to load fund map:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFundMap()
  }, [])

  const info = selected ? stateData[selected] : null

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Fund Tracker Map</h1>
          <p className="text-sm text-[#8B95A8] mt-1">Click a state below to view fund allocation and utilisation breakdown</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="h-64 animate-pulse bg-[#151A22]" />
          </div>
          <Card className="h-64 animate-pulse bg-[#151A22]" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Fund Tracker Map</h1>
        <p className="text-sm text-[#8B95A8] mt-1">Click a state below to view fund allocation and utilisation breakdown</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State grid instead of SVG map (fallback for demo) */}
        <div className="lg:col-span-2">
          <Card className="space-y-3">
            <h3 className="font-semibold text-[#E8EDF5] text-sm mb-3">State-wise Fund Allocation — Click to Explore</h3>
            {Object.keys(stateData).length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(stateData).map(([name, d]) => {
                  const pct = d.allocated > 0 ? Math.round((d.utilised / d.allocated) * 100) : 0
                  const isSelected = selected === name
                  return (
                    <button key={name} onClick={() => setSelected(isSelected ? null : name)}
                      className={`p-3 rounded-xl border text-left transition-all ${isSelected ? 'border-[#3B8BD4] bg-[#3B8BD4]/10' : 'border-[#1E2530] bg-[#0A0C10] hover:border-[#3B8BD4]/40 hover:bg-[rgba(255,255,255,0.03)]'}`}>
                      <div className="text-xs font-semibold text-[#E8EDF5] truncate">{name}</div>
                      <div className="text-xs text-[#8B95A8] mt-1">{d.tenders} tenders</div>
                      <div className="mt-2 h-1 bg-[#1E2530] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct > 70 ? '#1D9E75' : pct > 40 ? '#3B8BD4' : '#EF9F27' }} />
                      </div>
                      <div className="text-xs text-[#4A5568] mt-1">{pct}% utilised</div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-[#8B95A8]">No fund data available</div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {selected && info ? (
            <Card className="space-y-4">
              <h3 className="font-semibold text-[#E8EDF5] text-lg">{selected}</h3>
              <div className="space-y-3">
                <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-3">
                  <div className="text-xs text-[#4A5568] mb-1">Active Tenders</div>
                  <div className="text-2xl font-bold text-[#3B8BD4]">{info.tenders}</div>
                </div>
                <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-3">
                  <div className="text-xs text-[#4A5568] mb-1">Total Allocated</div>
                  <div className="text-lg font-bold text-[#E8EDF5]">{formatINR(info.allocated)}</div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#8B95A8]">Utilisation</span>
                    <span className="font-mono text-[#E8EDF5]">{info.allocated > 0 ? Math.round((info.utilised/info.allocated)*100) : 0}%</span>
                  </div>
                  <div className="h-2 bg-[#1E2530] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#3B8BD4] to-[#1D9E75] rounded-full transition-all duration-700" style={{ width: `${info.allocated > 0 ? (info.utilised/info.allocated)*100 : 0}%` }} />
                  </div>
                  <div className="flex justify-between text-xs mt-1 text-[#4A5568]">
                    <span>{formatINR(info.utilised)}</span>
                    <span>{formatINR(info.allocated)}</span>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-48">
              <p className="text-[#4A5568] text-sm text-center">Click a state tile to see fund breakdown</p>
            </Card>
          )}

          <Card className="space-y-3">
            <h3 className="font-semibold text-[#E8EDF5] text-sm">Top States by Allocation</h3>
            {Object.entries(stateData).sort((a,b) => b[1].allocated - a[1].allocated).slice(0,4).map(([name, d]) => (
              <div key={name} className="flex justify-between items-center">
                <span className="text-sm text-[#8B95A8]">{name}</span>
                <span className="text-sm font-mono text-[#E8EDF5]">{formatINR(d.allocated)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
