'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { tasksApi, authApi } from '@/lib/api';
import { Task, UserProfile, STATUS_META, AnalyticsData } from '@/lib/types';
import { toast } from 'sonner';
import {
  Plus, Trash2, UserCheck, CheckCircle2, RotateCcw, Loader2,
  TrendingUp, ClipboardList, Users, Image as ImageIcon, X,
} from 'lucide-react';
import Link from 'next/link';

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="glass rounded-2xl p-6 card-hover">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4`} style={{ background: `${color}22` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="text-3xl font-bold font-[Outfit] mb-1">{value.toLocaleString()}</div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<Task | null>(null);
  const [showRevision, setShowRevision] = useState<Task | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const init = async () => {
      const sb = createClient();
      const { data } = await sb.auth.getSession();
      const t = data.session?.access_token ?? '';
      setToken(t);
      if (t) {
        await Promise.all([fetchTasks(t), fetchAnalytics(t), fetchUsers(t)]);
      }
      setLoading(false);
    };
    init();
  }, []);

  const fetchTasks = async (t: string, status?: string) => {
    const res = await tasksApi.list(t, status ? { status } : {});
    setTasks(res.tasks);
  };

  const fetchAnalytics = async (t: string) => {
    const res = await tasksApi.analytics(t);
    setAnalytics(res);
  };

  const fetchUsers = async (t: string) => {
    const res = await authApi.listUsers(t);
    setUsers(res.users);
  };

  const handleFilter = async (s: string) => {
    setFilterStatus(s);
    setLoading(true);
    await fetchTasks(token, s || undefined);
    setLoading(false);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      await tasksApi.delete(token, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleAccept = async (taskId: string) => {
    try {
      const res = await tasksApi.accept(token, taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
      toast.success('Task accepted!');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  const handleAssign = async (taskId: string, userId: string) => {
    setFormLoading(true);
    try {
      const res = await tasksApi.assign(token, taskId, userId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
      setShowAssign(null);
      toast.success('Task assigned!');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleRevision = async () => {
    if (!showRevision || !revisionNotes.trim()) return;
    setFormLoading(true);
    try {
      const res = await tasksApi.requestRevision(token, showRevision.id, revisionNotes);
      setTasks((prev) => prev.map((t) => (t.id === showRevision.id ? res.task : t)));
      setShowRevision(null);
      setRevisionNotes('');
      toast.success('Revision requested');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-[Outfit]">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage tasks, users, and AI generation workflow</p>
        </div>
        <button
          id="create-task-btn"
          onClick={() => setShowCreate(true)}
          className="btn-primary"
        >
          <Plus size={18} /> New Task
        </button>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Tasks" value={analytics.total_tasks} icon={<ClipboardList size={22} />} color="#6366f1" />
          <StatCard label="Total Users" value={analytics.total_users} icon={<Users size={22} />} color="#22d3ee" />
          <StatCard label="AI Images Generated" value={analytics.total_generated_images} icon={<ImageIcon size={22} />} color="#22c55e" />
          <StatCard label="Pending Review" value={analytics.status_breakdown?.submitted ?? 0} icon={<TrendingUp size={22} />} color="#f59e0b" />
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'pending', 'assigned', 'in_progress', 'submitted', 'accepted', 'revision_requested'].map((s) => (
          <button
            key={s}
            onClick={() => handleFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                : 'bg-[#1a1a2e] text-slate-400 border border-[#334155] hover:border-slate-500'
            }`}
          >
            {s ? STATUS_META[s as keyof typeof STATUS_META]?.label : 'All'}
          </button>
        ))}
      </div>

      {/* Tasks Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#334155] text-slate-400 text-sm">
                <th className="text-left px-6 py-4 font-medium">Task</th>
                <th className="text-left px-6 py-4 font-medium hidden md:table-cell">Assigned To</th>
                <th className="text-left px-6 py-4 font-medium">Status</th>
                <th className="text-left px-6 py-4 font-medium hidden lg:table-cell">Images</th>
                <th className="text-right px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No tasks found. Create your first task!
                  </td>
                </tr>
              )}
              {tasks.map((task) => {
                const meta = STATUS_META[task.status];
                return (
                  <tr key={task.id} className="border-b border-[#334155]/50 hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/tasks/${task.id}`} className="font-medium hover:text-indigo-300 transition-colors">
                        {task.title}
                      </Link>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(task.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm text-slate-400">
                        {task.assigned_to_profile?.name ?? task.assigned_to_profile?.email ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="badge text-xs"
                        style={{ color: meta.color, background: meta.bg }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-sm text-slate-400">
                      {task.generation_count ?? 0}/8
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {task.status === 'pending' && (
                          <button
                            title="Assign"
                            onClick={() => setShowAssign(task)}
                            className="p-1.5 hover:text-blue-400 text-slate-400 transition-colors"
                          >
                            <UserCheck size={16} />
                          </button>
                        )}
                        {task.status === 'submitted' && (
                          <>
                            <button
                              title="Accept"
                              onClick={() => handleAccept(task.id)}
                              className="p-1.5 hover:text-green-400 text-slate-400 transition-colors"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              title="Request Revision"
                              onClick={() => { setShowRevision(task); setRevisionNotes(''); }}
                              className="p-1.5 hover:text-yellow-400 text-slate-400 transition-colors"
                            >
                              <RotateCcw size={16} />
                            </button>
                          </>
                        )}
                        <button
                          title="Delete"
                          onClick={() => handleDelete(task.id)}
                          className="p-1.5 hover:text-red-400 text-slate-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <CreateTaskModal
          token={token}
          onClose={() => setShowCreate(false)}
          onCreated={(task) => {
            setTasks((prev) => [task, ...prev]);
            setShowCreate(false);
            toast.success('Task created!');
          }}
        />
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Assign Task</h2>
              <button onClick={() => setShowAssign(null)}><X size={20} className="text-slate-400" /></button>
            </div>
            <p className="text-slate-400 text-sm mb-4">{showAssign.title}</p>
            <div className="space-y-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleAssign(showAssign.id, u.id)}
                  disabled={formLoading}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#334155] hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {(u.name ?? u.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{u.name ?? 'Unnamed'}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                </button>
              ))}
              {users.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No users found</p>}
            </div>
          </div>
        </div>
      )}

      {/* Revision Modal */}
      {showRevision && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Request Revision</h2>
              <button onClick={() => setShowRevision(null)}><X size={20} className="text-slate-400" /></button>
            </div>
            <p className="text-slate-400 text-sm mb-4">{showRevision.title}</p>
            <textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Describe what needs to be changed..."
              rows={4}
              className="w-full bg-[#16213e] border border-[#334155] rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 resize-none mb-4"
            />
            <button
              onClick={handleRevision}
              disabled={formLoading || !revisionNotes.trim()}
              className="btn-primary w-full justify-center"
            >
              {formLoading ? <Loader2 size={16} className="animate-spin" /> : 'Send Revision Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Task Modal ──────────────────────────────────────────────────────────
function CreateTaskModal({
  token,
  onClose,
  onCreated,
}: {
  token: string;
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', description);
      fd.append('product_image', file);
      const res = await tasksApi.create(token, fd);
      onCreated(res.task);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-[Outfit]">Create New Task</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Task Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pearl Necklace Product Photography"
              className="w-full bg-[#16213e] border border-[#334155] rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes for the photographer..."
              rows={3}
              className="w-full bg-[#16213e] border border-[#334155] rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Product Image *</label>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#334155] rounded-xl cursor-pointer hover:border-indigo-500/60 transition-colors overflow-hidden">
              {preview ? (
                <img src={preview} alt="Preview" className="h-full w-full object-contain" />
              ) : (
                <div className="text-center">
                  <ImageIcon size={32} className="mx-auto mb-2 text-slate-500" />
                  <p className="text-sm text-slate-400">Click to upload product image</p>
                  <p className="text-xs text-slate-600 mt-1">PNG, JPG, WebP up to 10MB</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" required />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !file || !title.trim()}
            className="btn-primary w-full justify-center"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <>Create Task <Plus size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
