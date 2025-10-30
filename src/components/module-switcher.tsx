
'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

type Module = {
  name: string;
  href: string;
};

const allModules: Module[] = [
  { name: 'Real Estate', href: 'https://ken.towerbuddy.tel/dashboard' },
  { name: 'Security', href: '#' }, // Href will be replaced by portal-specific home
  { name: 'Energy', href: '#' },
  { name: 'Incident Management', href: '#' },
  { name: 'Preventive Maintenance', href: '#' },
  { name: 'Site Master', href: '#' },
];

export function ModuleSwitcher({ portalHome }: { portalHome: '/agency/home' | '/towerco/home' }) {
  const pathname = usePathname();
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userDataString = localStorage.getItem('userData');
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          const subscribed = userData?.user?.organization?.subscribed_modules || [];
          // Normalize to lowercase for case-insensitive comparison
          setEnabledModules(subscribed.map((m: string) => m.toLowerCase()));
        } catch (error) {
          console.error("Failed to parse user data for module switcher:", error);
          setEnabledModules([]);
        }
      }
    }
  }, []);

  const isModuleEnabled = (moduleName: string) => {
    const lowerCaseModuleName = moduleName.toLowerCase();
    
    // Handle the specific case for "Real Estate" vs "realestate"
    if (lowerCaseModuleName === 'real estate') {
      return enabledModules.includes('realestate');
    }
    // Handle "Site Master" vs "site master"
    if (lowerCaseModuleName === 'site master') {
        return enabledModules.includes('site master');
    }

    return enabledModules.includes(lowerCaseModuleName);
  };
  
  const getModuleHref = (module: Module) => {
    if (module.name === 'Security') {
      return portalHome;
    }
    return module.href;
  }

  const isSecurityModuleActive = () => {
      return pathname.startsWith('/agency') || pathname.startsWith('/towerco');
  }

  return (
    <div className="bg-background border-b">
      <div className="container mx-auto px-4 md:px-6">
        <nav className="flex items-center justify-center gap-4 sm:gap-6 text-sm">
          {allModules.map((module) => {
            const enabled = isModuleEnabled(module.name);
            const isActive = module.name === 'Security' && isSecurityModuleActive();

            return (
              <Link
                key={module.name}
                href={enabled ? getModuleHref(module) : '#'}
                className={cn(
                  'px-3 py-1 font-semibold transition-colors rounded-md',
                  enabled
                    ? 'text-primary hover:text-primary/80'
                    : 'text-muted-foreground/60 cursor-not-allowed',
                  isActive && 'bg-destructive/10 border border-destructive text-destructive'
                )}
                aria-disabled={!enabled}
                onClick={(e) => !enabled && e.preventDefault()}
              >
                {module.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
