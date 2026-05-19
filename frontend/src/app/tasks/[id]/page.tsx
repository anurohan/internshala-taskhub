'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { tasksApi, generationsApi } from '@/lib/api';
import {
  Task, GeneratedImage, ImageType, ImageStatus,
  IMAGE_TYPE_META, ALL_IMAGE_TYPES, STATUS_META,
} from '@/lib/types';
import { toast } from 'sonner';
import {
  Loader2, Sparkles, Download, Trash2, Star, StarOff,
  RefreshCw, Send, ChevronLeft, AlertCircle, CheckCircle2,
  Image as ImageIcon, Play, Zap,
} from 'lucide-react';
import Link from 'next/link';

// ── Generation Slot Component ─────────────────────────────────────────────────
function GenerationSlot({
  imageType,
  generation,
  token,
  taskId,
  canGenerate,
  onRegenerate,
  onDelete,
  onMarkFinal,
}: {
  imageType: ImageType;
  generation: GeneratedImage | undefined;
  token: string;
  taskId: string;
  canGenerate: boolean;
  onRegenerate: (type: ImageType) => void;
  onDelete: (genId: string) => void;
  onMarkFinal: (genId: string) => void;
}) {
  const meta = IMAGE_TYPE_META[imageType];
  const status: ImageStatus = generation?.status ?? 'pending';

  const handleDownload = () => {
    if (!generation?.image_url) return;
    const a = document.createElement('a');
    a.href = generation.image_url;
    a.download = `${imageType}.png`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className={`glass rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${
      status === 'generating' ? 'pulse-ring border-indigo-500/60' : ''
    }`}>
      {/* Image area */}
      <div className="relative aspect-square bg-[#16213e] flex items-center justify-center">
        {status === 'done' && generation?.image_url ? (
          <>
            <img
              src={generation.image_url}
              alt={meta.label}
              className="w-full h-full object-cover"
            />
            {generation.is_final && (
              <div className="absolute top-2 right-2 bg-yellow-500 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                FINAL
              </div>
            )}
          </>
        ) : status === 'generating' ? (
          <div className="flex flex-col items-center gap-3 text-indigo-400">
            <div className="relative">
              <Loader2 size={36} className="animate-spin" />
              <Sparkles size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-400" />
            </div>
            <span className="text-xs text-slate-400">Generating…</span>
          </div>
        ) : status === 'failed' ? (
          <div className="flex flex-col items-center gap-2 text-red-400 px-4 text-center">
            <AlertCircle size={28} />
            <span className="text-xs">Generation failed</span>
            {generation?.error_message && (
              <span className="text-[10px] text-slate-500 line-clamp-2">{generation.error_message}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-600">
            <span className="text-3xl">{meta.emoji}</span>
            <span className="text-xs text-slate-500">{meta.description}</span>
          </div>
        )}

        {/* Slot number */}
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-[11px] font-bold text-slate-300">
          {meta.slot}
        </div>
      </div>

      {/* Slot footer */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-200 leading-tight">{meta.label}</div>
            <div className="text-[10px] text-slate-500">{meta.description}</div>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              status === 'done' ? 'bg-green-500/20 text-green-400' :
              status === 'generating' ? 'bg-indigo-500/20 text-indigo-400' :
              status === 'failed' ? 'bg-red-500/20 text-red-400' :
              'bg-slate-700 text-slate-400'
            }`}
          >
            {status}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 mt-auto">
          {canGenerate && (status === 'pending' || status === 'failed') && (
            <button
              onClick={() => onRegenerate(imageType)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg text-xs font-medium transition-colors"
            >
              <Zap size={12} /> Generate
            </button>
          )}
          {status === 'done' && generation && (
            <>
              {canGenerate && (
                <button
                  title="Regenerate"
                  onClick={() => onRegenerate(imageType)}
                  className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <RefreshCw size={13} />
                </button>
              )}
              <button
                title="Download"
                onClick={handleDownload}
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <Download size={13} />
              </button>
              {canGenerate && (
                <>
                  <button
                    title={generation.is_final ? 'Unmark final' : 'Mark as final'}
                    onClick={() => onMarkFinal(generation.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      generation.is_final
                        ? 'text-yellow-400 hover:bg-yellow-500/20'
                        : 'text-slate-400 hover:bg-white/10 hover:text-yellow-400'
                    }`}
                  >
                    {generation.is_final ? <Star size={13} /> : <StarOff size={13} />}
                  </button>
                  <button
                    title="Delete"
                    onClick={() => onDelete(generation.id)}
                    className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [generations, setGenerations] = useState<GeneratedImage[]>([]);
  const [token, setToken] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchGenerations = useCallback(async (t: string) => {
    try {
      const res = await generationsApi.list(t, id);
      setGenerations(res.generations);
      return res;
    } catch {
      return null;
    }
  }, [id]);

  const startPolling = useCallback((t: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const res = await fetchGenerations(t);
      // Stop polling when no images are in 'generating' state
      if (res && !res.generations.some((g) => g.status === 'generating')) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
      }
    }, 3000);
  }, [fetchGenerations]);

  useEffect(() => {
    const init = async () => {
      const sb = createClient();
      const { data } = await sb.auth.getSession();
      const t = data.session?.access_token ?? '';
      setToken(t);

      if (t) {
        const [taskRes, genRes] = await Promise.all([
          tasksApi.get(t, id),
          generationsApi.list(t, id),
        ]);

        setTask(taskRes.task);
        setGenerations(genRes.generations);

        // Check admin
        const profile = await sb.from('users').select('role').eq('id', data.session!.user.id).single();
        setIsAdmin(profile.data?.role === 'admin');

        // Start polling if there are generating images
        if (genRes.generations.some((g) => g.status === 'generating')) {
          startPolling(t);
        }
      }
      setLoading(false);
    };
    init();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [id, fetchGenerations, startPolling]);

  const handleStartTask = async () => {
    if (!token || !task) return;
    setStarting(true);
    try {
      const res = await tasksApi.start(token, id);
      setTask(res.task);
      toast.success('Task started! You can now generate images.');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const handleGenerate = async (imageTypes?: ImageType[]) => {
    if (!token) return;
    try {
      await generationsApi.generate(token, id, imageTypes);
      toast.success(`${imageTypes?.length ?? 8} generation job(s) started!`);
      // Update local state to 'generating'
      setGenerations((prev) => {
        const typesToUpdate = imageTypes ?? ALL_IMAGE_TYPES;
        const updated = [...prev];
        typesToUpdate.forEach((type) => {
          const idx = updated.findIndex((g) => g.image_type === type);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], status: 'generating' };
          } else {
            updated.push({
              id: `temp-${type}`,
              task_id: id,
              image_type: type,
              status: 'generating',
              image_url: null,
              prompt_used: null,
              metadata: {},
              angle: null,
              is_final: false,
              error_message: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        });
        return updated;
      });
      startPolling(token);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async (genId: string) => {
    if (!token) return;
    try {
      await generationsApi.delete(token, genId);
      setGenerations((prev) => prev.filter((g) => g.id !== genId));
      toast.success('Image deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleMarkFinal = async (genId: string) => {
    if (!token) return;
    try {
      const res = await generationsApi.markFinal(token, genId);
      setGenerations((prev) => prev.map((g) => g.id === genId ? res.generation : g));
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await tasksApi.submit(token, id);
      setTask(res.task);
      toast.success('Task submitted for review! 🎉');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2">Task not found</h1>
          <Link href="/dashboard" className="text-indigo-400 hover:underline">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const genMap = Object.fromEntries(generations.map((g) => [g.image_type, g])) as Record<ImageType, GeneratedImage>;
  const completedCount = generations.filter((g) => g.status === 'done').length;
  const allDone = completedCount === 8;
  const canGenerate = !isAdmin && ['in_progress', 'revision_requested'].includes(task.status);
  const statusMeta = STATUS_META[task.status];

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {/* Floating top bar */}
      <div className="fixed top-0 inset-x-0 z-50 glass border-b border-[#334155]/50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={isAdmin ? '/admin' : '/dashboard'}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-slate-100 leading-tight">{task.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="badge text-[10px]"
                  style={{ color: statusMeta.color, background: statusMeta.bg }}
                >
                  {statusMeta.label}
                </span>
                <span className="text-xs text-slate-500">AI Studio</span>
              </div>
            </div>
          </div>

          {/* Progress + actions */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <div className="text-sm text-slate-400">
                <span className="font-bold text-white">{completedCount}</span>/8 images
              </div>
              <div className="w-32 h-1.5 bg-[#16213e] rounded-full">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                  style={{ width: `${(completedCount / 8) * 100}%` }}
                />
              </div>
              {allDone && <CheckCircle2 size={16} className="text-green-400" />}
            </div>

            {canGenerate && (
              <button
                onClick={() => handleGenerate()}
                className="btn-primary py-2 px-4 text-sm"
              >
                <Sparkles size={15} /> Generate All 8
              </button>
            )}

            {canGenerate && allDone && task.status === 'in_progress' && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Submit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-20 max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-6 flex-col lg:flex-row">

          {/* ── Left Sidebar: Product Info ── */}
          <div className="lg:w-72 flex-shrink-0 space-y-4">
            {/* Product image */}
            <div className="glass rounded-2xl overflow-hidden">
              <img
                src={task.product_image_url}
                alt={task.title}
                className="w-full aspect-square object-contain bg-[#16213e]"
              />
              {task.product_image_removed_bg_url && (
                <div className="p-3 border-t border-[#334155]">
                  <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">BG Removed</div>
                  <img
                    src={task.product_image_removed_bg_url}
                    alt="BG Removed"
                    className="w-full aspect-square object-contain rounded-xl"
                    style={{ background: 'repeating-conic-gradient(#334155 0% 25%, #16213e 0% 50%) 0 0 / 16px 16px' }}
                  />
                </div>
              )}
            </div>

            {/* Task details */}
            <div className="glass rounded-2xl p-4 space-y-3">
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Task</div>
                <div className="text-sm font-semibold text-slate-100">{task.title}</div>
              </div>
              {task.description && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</div>
                  <div className="text-sm text-slate-400 leading-relaxed">{task.description}</div>
                </div>
              )}
              {task.product_descriptor && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">AI Descriptor</div>
                  <div className="text-xs text-slate-400 leading-relaxed bg-[#16213e] rounded-lg p-2">{task.product_descriptor}</div>
                </div>
              )}
              {task.admin_notes && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-yellow-400 uppercase tracking-wide mb-1">Admin Feedback</div>
                  <div className="text-xs text-yellow-300 leading-relaxed">{task.admin_notes}</div>
                </div>
              )}
            </div>

            {/* Start Task button (if assigned but not started) */}
            {!isAdmin && task.status === 'assigned' && (
              <button
                onClick={handleStartTask}
                disabled={starting}
                className="btn-primary w-full justify-center"
              >
                {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                Start Task
              </button>
            )}

            {/* Mobile progress */}
            <div className="lg:hidden glass rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Progress</span>
                <span className="text-sm font-bold">{completedCount}/8</span>
              </div>
              <div className="w-full h-2 bg-[#16213e] rounded-full">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${(completedCount / 8) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Main: 8 Image Slots Grid ── */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-[Outfit]">
                AI Studio{' '}
                <span className="text-slate-500 text-base font-normal">— 8 image types</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {ALL_IMAGE_TYPES.map((type) => (
                <GenerationSlot
                  key={type}
                  imageType={type}
                  generation={genMap[type]}
                  token={token}
                  taskId={id}
                  canGenerate={canGenerate}
                  onRegenerate={(t) => handleGenerate([t])}
                  onDelete={handleDelete}
                  onMarkFinal={handleMarkFinal}
                />
              ))}
            </div>

            {/* Submit Panel */}
            {canGenerate && task.status === 'in_progress' && (
              <div className={`mt-6 rounded-2xl p-6 border transition-all ${
                allDone
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'glass border-[#334155]'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      {allDone ? '🎉 All 8 images ready!' : `${8 - completedCount} image${8 - completedCount === 1 ? '' : 's'} remaining`}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {allDone
                        ? 'Submit your work for admin review.'
                        : 'Generate all 8 images to enable submission.'}
                    </p>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={!allDone || submitting}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                      allDone
                        ? 'bg-green-500 hover:bg-green-400 text-white'
                        : 'bg-[#16213e] text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    Submit for Review
                  </button>
                </div>
              </div>
            )}

            {/* Accepted banner */}
            {task.status === 'accepted' && (
              <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
                <CheckCircle2 size={32} className="mx-auto mb-3 text-green-400" />
                <h3 className="text-xl font-bold text-green-300 mb-1">Task Accepted! 🌟</h3>
                <p className="text-slate-400 text-sm">Your submission has been approved by the admin.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
