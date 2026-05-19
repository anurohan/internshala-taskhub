'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { tasksApi } from '@/lib/api';
import { Task, STATUS_META, ALL_IMAGE_TYPES } from '@/lib/types';
import Link from 'next/link';
import { Loader2, ArrowRight, Clock, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';

function TaskCard({ task }: { task: Task }) {
  const meta = STATUS_META[task.status];
  const progress = Math.round(((task.generation_count ?? 0) / 8) * 100);

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="glass rounded-2xl p-5 card-hover cursor-pointer group">
        {/* Product thumbnail */}
        <div className="w-full h-40 rounded-xl overflow-hidden bg-[#16213e] mb-4">
          <img
            src={task.product_image_url}
            alt={task.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Status */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="badge text-xs"
            style={{ color: meta.color, background: meta.bg }}
          >
            {meta.label}
          </span>
          <span className="text-xs text-slate-500">
            {new Date(task.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-slate-100 mb-1 group-hover:text-indigo-300 transition-colors">
          {task.title}
        </h3>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Images generated</span>
            <span className="font-medium text-slate-300">{task.generation_count ?? 0}/8</span>
          </div>
          <div className="w-full bg-[#16213e] rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Admin notes (if revision) */}
        {task.status === 'revision_requested' && task.admin_notes && (
          <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-300 leading-relaxed line-clamp-2">{task.admin_notes}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end mt-3 text-indigo-400 text-sm font-medium">
          Open Studio <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

export default function UserDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const sb = createClient();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token ?? '';
      if (token) {
        const res = await tasksApi.myTasks(token);
        setTasks(res.tasks);
      }
      setLoading(false);
    };
    init();
  }, []);

  const tasksByStatus = {
    active: tasks.filter((t) =>
      ['assigned', 'in_progress', 'revision_requested'].includes(t.status)
    ),
    submitted: tasks.filter((t) => t.status === 'submitted'),
    completed: tasks.filter((t) => t.status === 'accepted'),
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-[Outfit]">My Tasks</h1>
        <p className="text-slate-400 mt-1">Manage your assigned product photography tasks</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 font-[Outfit]">{tasksByStatus.active.length}</div>
          <div className="text-sm text-slate-400 mt-1">Active</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400 font-[Outfit]">{tasksByStatus.submitted.length}</div>
          <div className="text-sm text-slate-400 mt-1">Submitted</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400 font-[Outfit]">{tasksByStatus.completed.length}</div>
          <div className="text-sm text-slate-400 mt-1">Accepted</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <ImageIcon size={48} className="mx-auto mb-4 text-slate-600" />
          <h2 className="text-xl font-semibold text-slate-400 mb-2">No tasks yet</h2>
          <p className="text-slate-500 text-sm">Your admin will assign tasks to you soon.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {tasksByStatus.active.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 text-slate-200 flex items-center gap-2">
                <Clock size={18} className="text-blue-400" /> Active Tasks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasksByStatus.active.map((t) => <TaskCard key={t.id} task={t} />)}
              </div>
            </section>
          )}
          {tasksByStatus.submitted.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 text-slate-200 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-purple-400" /> Under Review
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasksByStatus.submitted.map((t) => <TaskCard key={t.id} task={t} />)}
              </div>
            </section>
          )}
          {tasksByStatus.completed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 text-slate-200 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-400" /> Completed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasksByStatus.completed.map((t) => <TaskCard key={t.id} task={t} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
