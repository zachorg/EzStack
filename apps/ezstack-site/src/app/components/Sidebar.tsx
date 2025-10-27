"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarProvider";
import { useAuth } from "./AuthProvider";

export function Sidebar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const { sections } = useSidebar();
  const { isLoading: authLoading } = useAuth();

  // Wait for auth to be ready before rendering
  if (authLoading) {
    return null;
  }

  return (
    <div 
      className={`glass-effect flex flex-col transition-all duration-300 ease-in-out fixed left-0 z-50 w-12 overflow-hidden ${
        isHovered ? 'w-48' : ''
      }`}
      style={{ top: '47px', height: 'calc(100vh - 47px)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >

      {/* Navigation */}
      <nav className="flex-1 p-2 pt-4 space-y-4 overflow-y-auto overflow-x-hidden">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className={`text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <div className="flex items-center">
                      {/* Icon Button */}
                              <Link
                                href={item.href}
                                className={`group relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${
                                  isActive
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                                }`}
                              >
                        <div className="w-5 h-5 flex items-center justify-center">
                          {item.icon}
                        </div>
                        
                                {/* Tooltip for collapsed state */}
                                {!isHovered && (
                                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                                    {item.name}
                                  </div>
                                )}
                      </Link>
                      
                      {/* Text Label - Only visible when expanded */}
                      {isHovered && (
                        <div className="ml-3 flex items-center">
                          <span className="text-sm font-medium text-gray-200">
                            {item.name}
                          </span>
                          {item.badge && (
                            <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-600/20 text-blue-400 rounded-full border border-blue-600/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

    </div>
  );
}
