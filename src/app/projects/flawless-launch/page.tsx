'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RedirectProjectFlawlessLaunchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    router.replace(`/flawless-launch${qs}`);
  }, [router, searchParams]);

  return (
    <div className="p-8 text-center text-xs text-slate-500">
      Redirecting to Flawless Launch...
    </div>
  );
}
