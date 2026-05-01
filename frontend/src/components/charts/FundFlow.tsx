import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Jan', allocated: 4000, utilised: 2400 },
  { name: 'Feb', allocated: 3000, utilised: 1398 },
  { name: 'Mar', allocated: 2000, utilised: 9800 },
  { name: 'Apr', allocated: 2780, utilised: 3908 },
  { name: 'May', allocated: 1890, utilised: 4800 },
  { name: 'Jun', allocated: 2390, utilised: 3800 },
  { name: 'Jul', allocated: 3490, utilised: 4300 },
]

export function FundFlowChart() {
  return (
    <div className="h-64 w-full text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 0, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2530" vertical={false} />
          <XAxis dataKey="name" stroke="#8B95A8" tickLine={false} axisLine={false} />
          <YAxis stroke="#8B95A8" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}k`} />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{ backgroundColor: '#0F1318', border: '1px solid #1E2530', borderRadius: '8px' }}
          />
          <Bar dataKey="allocated" fill="#1E2530" radius={[4, 4, 0, 0]} />
          <Bar dataKey="utilised" fill="#3B8BD4" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
