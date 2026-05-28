'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/auth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#090a0c] text-white">
      <Loader2 className="h-10 w-10 animate-spin text-[#e50914]" />
      <p className="mt-4 text-xs font-semibold tracking-wider text-gray-500">Redirecting...</p>
    </div>
  );
}

