"use client";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import RightSidebar from "@/components/RightSidebar";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      if (pathname === '/login') {
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabaseBrowser.auth.getSession();
      
      if (!session && mounted) {
        router.push('/login');
      } else if (mounted) {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== '/login' && mounted) {
        router.push('/login');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);
  
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Prevent flicker of the dashboard before we know auth state
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-canvas">
        <svg className="animate-spin h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
          <RightSidebar />
        </div>
      </main>
    </div>
  );
}
