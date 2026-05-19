'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, LayoutDashboard, ClipboardList, Users, LogOut, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { UserProfile } from '@/lib/types';

interface NavbarProps {
  user: UserProfile;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isAdmin = user.role === 'admin';

  const navLinks = isAdmin
    ? [
        { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { href: '/admin/tasks', label: 'Tasks', icon: <ClipboardList size={16} /> },
        { href: '/admin/users', label: 'Users', icon: <Users size={16} /> },
      ]
    : [{ href: '/dashboard', label: 'My Tasks', icon: <ClipboardList size={16} /> }];

  const handleLogout = async () => {
    const sb = createClient();
    await sb.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-[#334155]/50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <span className="text-lg font-bold font-[Outfit] gradient-text">TaskHub</span>
          {isAdmin && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">
              Admin
            </span>
          )}
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            id="nav-user-menu"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name ?? ''} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                {(user.name ?? user.email)[0].toUpperCase()}
              </div>
            )}
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-slate-200 leading-none">{user.name ?? 'User'}</div>
              <div className="text-xs text-slate-500 mt-0.5">{user.email}</div>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-48 glass rounded-xl p-2 shadow-xl">
              <button
                id="nav-logout"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
