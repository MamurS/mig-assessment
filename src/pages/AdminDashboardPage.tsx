import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandHeader from '@/components/BrandHeader';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/test-content';
import type { Attempt } from '@/types';

type StatusFilter = 'all' | 'in_progress' | 'submitted' | 'graded';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data, error } = await supabase
        .from('attempts')
        .select('*')
        .order('submitted_at', { ascending: false, nullsFirst: false });

      if (mounted) {
        if (error) {
          console.error(error);
        } else {
          setAttempts((data ?? []) as Attempt[]);
        }
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    return attempts
      .filter((a) => filter === 'all' || a.status === filter)
      .filter((a) =>
        !search.trim() ||
        a.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
        a.candidate_email.toLowerCase().includes(search.toLowerCase())
      );
  }, [attempts, filter, search]);

  function exportCSV() {
    const headers = ['Name', 'Email', 'Language', 'Started', 'Submitted', 'Status', 'Auto Score', 'Final Score'];
    const rows = filtered.map((a) => [
      a.candidate_name,
      a.candidate_email,
      a.lang.toUpperCase(),
      formatDate(a.started_at),
      formatDate(a.submitted_at),
      a.status,
      a.auto_score?.toFixed(1) ?? '',
      a.manual_score?.toFixed(1) ?? a.auto_score?.toFixed(1) ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <BrandHeader small />
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-accent-500 font-medium">
              Admin
            </div>
            <h1 className="font-display text-3xl text-ink-900 mt-1">Assessment results</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="btn-outline text-sm">
              ⤓ Export CSV
            </button>
            <button onClick={logout} className="btn-ghost text-sm">
              Sign out
            </button>
          </div>
        </div>

        <div className="card p-5 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex gap-1 bg-ink-100 p-1 rounded-md">
            {(['all', 'submitted', 'graded', 'in_progress'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                  filter === s ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search by name or email…"
            className="input flex-1 max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="text-xs text-ink-500 ml-auto">
            {filtered.length} {filtered.length === 1 ? 'attempt' : 'attempts'}
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-ink-500 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-ink-500 text-sm">No attempts yet.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-ink-50/50 border-b border-ink-100">
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500">
                  <th className="px-5 py-3 font-medium">Candidate</th>
                  <th className="px-5 py-3 font-medium">Lang</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const score = a.manual_score ?? a.auto_score;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => navigate(`/admin/attempts/${a.id}`)}
                      className="border-b border-ink-100 last:border-0 hover:bg-ink-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-ink-900">{a.candidate_name}</div>
                        <div className="text-xs text-ink-500">{a.candidate_email}</div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-600 uppercase">{a.lang}</td>
                      <td className="px-5 py-3.5 text-sm text-ink-600">{formatDate(a.submitted_at)}</td>
                      <td className="px-5 py-3.5">
                        <StatusChip status={a.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {score != null ? (
                          <span className="font-mono font-medium text-ink-900">
                            {score.toFixed(1)}
                            <span className="text-ink-400">/100</span>
                          </span>
                        ) : (
                          <span className="text-ink-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    in_progress: 'bg-amber-50 text-amber-700',
    submitted: 'bg-blue-50 text-blue-700',
    graded: 'bg-emerald-50 text-emerald-700',
  };
  const label = status.replace('_', ' ');
  return (
    <span className={`chip ${styles[status] ?? 'bg-ink-100 text-ink-700'}`}>
      {label}
    </span>
  );
}
