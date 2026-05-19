import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import type { UserProfile } from '@/lib/types';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  // Admin redirected to admin panel
  if (profile.role === 'admin') redirect('/admin');

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <Navbar user={profile as UserProfile} />
      <main className="pt-20 max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
