
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the default attendance report page
    router.replace('/dashboard/reports/attendance');
  }, [router]);

  // Render a loading state or null while redirecting
  return null;
}
