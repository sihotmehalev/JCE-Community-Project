export function Button({ children, variant = "default", ...props }) { 
  const baseClasses = 'rounded px-4 py-2 transition-all duration-200';
  const variantClasses = variant === "outline" 
    ? 'border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white' 
    : 'bg-orange-600 text-white hover:bg-orange-700';
  
  return <button {...props} className={`${baseClasses} ${variantClasses} ${props.className || ''}`}>{children}</button>; 
}