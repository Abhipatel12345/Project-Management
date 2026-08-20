'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectDetailPageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/projects/PROJ-0001');
  }, [router]);
  return null;
}
