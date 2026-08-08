'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectDetailPageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/projects/charter');
  }, [router]);
  return null;
}
