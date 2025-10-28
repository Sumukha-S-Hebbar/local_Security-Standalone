
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  LogOut,
  Menu
} from 'lucide-react';
import { NavLinks, menuItems } from './sidebar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ModuleSwitcher } from '@/components/module-switcher';

export default function TowercoHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (event.clientY < 100) { // Increased threshold to avoid hiding with the new top bar
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [lastScrollY]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
       const loggedOutState = {
        isLoggedIn: false,
        user: null,
        role: null,
        token: null,
        hasUserProfile: null,
        orgCode: null,
        globalConsent: null,
      };
      localStorage.setItem('userData', JSON.stringify(loggedOutState));
    }
    router.push('/');
  };

  return (
    <header className={cn(
      "bg-header text-header-foreground sticky top-0 z-50 transition-transform duration-300",
      !isVisible && "-translate-y-full"
    )}>
      <ModuleSwitcher portalHome="/towerco/home" />
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <div className="flex items-center gap-6 flex-1">
          <Link href="/towerco/home" className="flex items-center gap-2 text-header-foreground">
            <Shield className="w-8 h-8" />
            <span className="text-xl font-bold">Secure Buddy</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-2 justify-center flex-1">
          <NavLinks />
        </nav>

        <div className="hidden md:flex items-center gap-2 justify-end flex-1">
           <Button onClick={handleLogout} variant="ghost" className="text-base text-header-foreground hover:text-header-foreground hover:bg-header-background/50">
              <LogOut className="mr-2 h-5 w-5" />
              <span>Logout</span>
            </Button>
        </div>
        
        <div className="md:hidden ml-auto">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] bg-header text-header-foreground p-0">
                     <div className="flex items-center gap-2 p-4 border-b border-white/10">
                        <Shield className="w-8 h-8" />
                        <div>
                            <h1 className="text-xl font-bold">Secure Buddy</h1>
                            <p className="text-xs">TOWERCO/MNO Portal</p>
                        </div>
                    </div>
                    <nav className="flex flex-col p-4 space-y-2">
                        {menuItems.map((item) => (
                           <SheetClose key={item.href} asChild>
                             <Link href={item.href} className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-header-foreground/70 transition-all hover:text-header-foreground",
                                pathname.startsWith(item.href) && "bg-black/20 text-header-foreground"
                             )}>
                               <item.icon className="h-5 w-5" />
                               {item.label}
                             </Link>
                           </SheetClose>
                        ))}
                    </nav>
                    <div className="p-4 mt-auto border-t border-white/10">
                        <SheetClose asChild>
                            <Button onClick={handleLogout} className="flex items-center gap-3 rounded-lg px-3 py-2 text-header-foreground transition-all hover:text-header-foreground/80 w-full justify-start">
                                <LogOut className="h-5 w-5" />
                                Logout
                            </Button>
                        </SheetClose>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
      </div>
    </header>
  );
}
