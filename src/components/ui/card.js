export function Card({ children, ...props }) { 
  return <div {...props} className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-custom-card border border-orange-100 ${props.className || ''}`}>{children}</div>; 
}
export function CardContent({ children }) { 
  return <div className='p-4'>{children}</div>; 
}