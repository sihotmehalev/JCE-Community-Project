export function Button({ children, variant = "default", ...props }) { 
  const baseClasses = 'rounded px-4 py-2 transition-all duration-200';
  let variantClasses;
  if (variant === "outline") {
    variantClasses = 'border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white'; 
  } else if (variant === "ghost") {
    variantClasses = 'text-orange-700 hover:bg-orange-100 border-2 border-transparent';
  } else { // default
    variantClasses = 'bg-orange-600 text-white hover:bg-orange-700 border-2 border-transparent';
  }
  
  return <button {...props} className={`${baseClasses} ${variantClasses} ${props.className || ''}`}>{children}</button>; 
}