'use client';

import { OrganizationNode } from '@/src/config/types';
import { Building2, ChevronRight, User } from 'lucide-react';

interface TreeNodeProps {
  node: OrganizationNode;
  level?: number;
  isLast?: boolean;
}

function TreeNode({ node, level = 0, isLast = false }: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  
  const getBgColor = () => {
    if (level === 0) return 'from-blue-600 to-indigo-700';
    if (level === 1) return 'from-emerald-500 to-teal-600';
    if (level === 2) return 'from-amber-500 to-orange-600';
    return 'from-violet-500 to-purple-600';
  };

  return (
    <div className="relative">
      {/* Connection Line */}
      {level > 0 && (
        <div className="absolute -left-4 top-0 bottom-0 w-px bg-linear-to-b from-gray-300 to-transparent"></div>
      )}
      
      {/* Node Card */}
      <div className={`${level > 0 ? 'ml-8' : ''} mb-4`}>
        <div className="group relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200">
          {/* Colored Top Border */}
          <div className={`h-1 bg-linear-to-r ${getBgColor()}`}></div>
          
          <div className="p-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className={`relative shrink-0`}>
                <div className={`w-14 h-14 rounded-full bg-linear-to-br ${getBgColor()} text-white flex items-center justify-center text-lg font-bold shadow-lg`}>
                  {node.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                {level === 0 && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              
              {/* Content */}
              <div className="grow">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  {node.name}
                  {level === 0 && <Building2 className="w-5 h-5 text-blue-600" />}
                  {level > 0 && <User className="w-4 h-4 text-gray-500" />}
                </h3>
                {node.title && (
                  <p className="text-sm text-gray-600 mt-1">{node.title}</p>
                )}
                {node.department && (
                  <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {node.department}
                  </span>
                )}
              </div>
              
              {/* Children Indicator */}
              {hasChildren && (
                <div className="shrink-0">
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700">
                    <span className="text-xs font-semibold">{node.children!.length}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Children */}
      {hasChildren && (
        <div className="relative">
          {node.children!.map((child, index) => (
            <TreeNode 
              key={child.id} 
              node={child} 
              level={level + 1}
              isLast={index === node.children!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface OrganizationTreeProps {
  data: OrganizationNode;
}

export default function OrganizationTree({ data }: OrganizationTreeProps) {
  return (
    <div className="organization-tree p-6">
      <TreeNode node={data} />
    </div>
  );
}