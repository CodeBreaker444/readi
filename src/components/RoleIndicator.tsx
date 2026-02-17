import { Role } from "@/lib/auth/roles";

export const RoleIndicator: React.FC<{ role: Role | null }> = ({ role }) => {
  const roleColors: Record<Role, string> = {
    'SUPERADMIN': 'bg-red-600',    
    'ADMIN': 'bg-orange-500',      
    'PIC': 'bg-blue-500',          
    'OPM': 'bg-emerald-500',       
    'SM': 'bg-purple-500',         
    'AM': 'bg-cyan-500',           
    'CMM': 'bg-indigo-500',        
    'RM': 'bg-rose-500',           
    'TM': 'bg-amber-500',          
    'DC': 'bg-slate-500',          
    'SLA': 'bg-lime-500',          
    'CLIENT': 'bg-gray-400',       
  };

  const activeColor = role ? roleColors[role] : 'bg-gray-200';

  return (
    <div 
      className={`fixed top-0 left-0 right-0 h-1.5 z-[9999] transition-colors duration-500 ${activeColor}`}
      title={`Role: ${role || 'Guest'}`}
    />
  );
};