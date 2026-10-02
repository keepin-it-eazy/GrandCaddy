// src/pages/Messages.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type ThreadPreview = {
  thread_id: string;
  other_id: string;
  other_name: string | null;
  last_body: string;
  last_at: string;
  unread: number;
};

export default function Messages() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // fetch all messages I'm part of, newest first
      const { data, error } = await supabase
        .from("messages")
        .select("id, thread_id, sender_id, recipient_id, body, read_at, created_at")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // group by thread, keep latest per thread, count unread
      const byThread = new Map<string, ThreadPreview>();
      for (const m of data ?? []) {
        const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        const existing = byThread.get(m.thread_id);
        const isUnread = m.recipient_id === user.id && !m.read_at;

        if (!existing) {
          byThread.set(m.thread_id, {
            thread_id: m.thread_id,
            other_id: other,
            other_name: null,
            last_body: m.body,
            last_at: m.created_at,
            unread: isUnread ? 1 : 0,
          });
        } else if (isUnread) {
          existing.unread += 1;
        }
      }

      // fetch other-participant names in one go
      const otherIds = Array.from(byThread.values()).map((t) => t.other_id);
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", otherIds);

        const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
        for (const t of byThread.values()) {
          t.other_name = nameMap.get(t.other_id) ?? null;
        }
      }

      setThreads(
        Array.from(byThread.values()).sort(
          (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
        )
      );
      setLoading(false);
    }
    void load();
  }, [navigate]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <p className="mx-auto max-w-3xl text-gray-500">Loading messages…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="mt-1 text-gray-500">
            Conversations with your Caddies and customers.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-100 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {threads.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-gray-600">No conversations yet.</p>
            <p className="mt-1 text-sm text-gray-500">
              Messages open once you have a booking with someone.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {threads.map((t) => (
              <li key={t.thread_id}>
                <Link
                  to={`/messages/${t.thread_id}`}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 hover:border-[#0B5FFF]"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E9EEFB] font-semibold text-[#0B5FFF]">
                      {(t.other_name ?? "?")[0]?.toUpperCase() ?? "?"}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {t.other_name ?? "User"}
                      </p>
                      <p className="line-clamp-1 text-sm text-gray-500">
                        {t.last_body}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(t.last_at).toLocaleDateString()}
                    </p>
                    {t.unread > 0 && (
                      <span className="mt-1 inline-block rounded-full bg-[#0B5FFF] px-2 py-0.5 text-xs font-semibold text-white">
                        {t.unread}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}