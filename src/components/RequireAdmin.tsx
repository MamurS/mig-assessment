import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'ok' | 'no'>('loading');

  useEffect(() => {
    let mounted = true;

    async function check() {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        if (mounted) setStatus('no');
        return;
      }
      // Verify the user is in admins table.
      // RLS allows them to read only their own row.
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', sess.session.user.id)
        .maybeSingle();

      if (mounted) {
        if (error || !data) {
          // Signed in but not an admin — sign them out so they can't linger.
          await supabase.auth.signOut();
          setStatus('no');
        } else {
          setStatus('ok');
        }
      }
    }
    check();
    return () => { mounted = false; };
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-500 text-sm">
        Loading…
      </div>
    );
  }
  if (status === 'no') {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}
