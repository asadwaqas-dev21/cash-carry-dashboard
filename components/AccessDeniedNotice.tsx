"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Shown after requirePageAccess() redirects a user away from a section their role can't open.
export default function AccessDeniedNotice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const denied = searchParams.get("denied");

  if (!denied) return null;

  return (
    <div className="mx-6 mt-4 p-3 text-sm text-bad bg-badSoft border border-bad/20 rounded-md flex items-center gap-3">
      <span className="flex-1">
        Your role doesn&apos;t have access to <span className="font-medium num">{denied}</span>. Ask the owner if you need it.
      </span>
      <button onClick={() => router.replace(pathname)} className="text-xs font-medium hover:underline">
        Dismiss
      </button>
    </div>
  );
}
