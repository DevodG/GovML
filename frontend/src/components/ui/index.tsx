import React from 'react'

export function Card({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl backdrop-blur-md p-6 ${className}`}>
      {children}
    </div>
  )
}

export function Button({ 
  children, 
  variant = 'primary', 
  className = '',
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const baseStyle = "px-4 py-2 rounded-lg font-semibold transition-all duration-150 flex items-center justify-center gap-2"
  const variants = {
    primary: "bg-[#3B8BD4] hover:bg-[#2A75BB] text-white",
    ghost: "bg-transparent border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] text-[#E8EDF5]",
    danger: "bg-[rgba(216,90,48,0.1)] border border-[rgba(216,90,48,0.2)] text-[#D85A30] hover:bg-[rgba(216,90,48,0.2)]"
  }
  
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Badge({ 
  children, 
  variant = 'blue' 
}: { children: React.ReactNode, variant?: 'blue' | 'teal' | 'amber' | 'purple' | 'coral' | 'gray' }) {
  const colors = {
    blue: "bg-[#3B8BD4]/10 text-[#3B8BD4] border-[#3B8BD4]/20",
    teal: "bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/20",
    amber: "bg-[#EF9F27]/10 text-[#EF9F27] border-[#EF9F27]/20",
    purple: "bg-[#7F77DD]/10 text-[#7F77DD] border-[#7F77DD]/20",
    coral: "bg-[#D85A30]/10 text-[#D85A30] border-[#D85A30]/20",
    gray: "bg-[#4A5568]/10 text-[#8B95A8] border-[#4A5568]/20"
  }
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${colors[variant]}`}>
      {children}
    </span>
  )
}

export function StatusDot({ status }: { status: 'live' | 'pending' | 'flagged' }) {
  const colors = {
    live: 'bg-[#1D9E75]',
    pending: 'bg-[#EF9F27]',
    flagged: 'bg-[#D85A30]'
  }
  return <div className={`w-2 h-2 rounded-full ${colors[status]} shadow-[0_0_8px_currentColor] opacity-80`} />
}
