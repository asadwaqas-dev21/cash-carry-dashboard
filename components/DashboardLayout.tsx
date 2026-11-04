"use client";

import Sidebar, { type SidebarBadges } from "@/components/Sidebar";
import Header from "@/components/Header";
import RightSidebar from "@/components/RightSidebar";
import AccessDeniedNotice from "@/components/AccessDeniedNotice";
import type { DashboardUser } from "@/lib/auth";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

// Sign-in and role checks happen on the server in app/(dashboard)/layout.tsx and each page.
export default function DashboardLayout({
  user,
  badges,
  children,
}: {
  user: DashboardUser;
  badges: SidebarBadges;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} badges={badges} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <Suspense fallback={null}>
          <AccessDeniedNotice />
        </Suspense>
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
          {pathname !== '/pos' && <RightSidebar />}
        </div>
      </main>
    </div>
  );
}
