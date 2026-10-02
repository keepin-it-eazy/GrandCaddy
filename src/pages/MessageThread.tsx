// src/pages/MessageThread.tsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Msg = {
  id: number;
  thread_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export default function MessageThread() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();

  const [me, setMe] = useState<string | null>(null);
  const [otherName, setOtherName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!threadId) return;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setMe(user.id);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const list = (data ?? []) as Msg[];
      setMessages(list);

      const other = list.find((m) => m.sender_id !== user.id)?.sender_id
        ?? list.find((m) => m.recipient_id !== user.id)?.recipient_id;

      if (other) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", other)
          .maybeSingle();
        setOtherName(p?.full_name ?? null);

        // mark all incoming as read
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("thread_id", threadId)
          .eq("recipient_id", user.id)
          .is("read_at", null);
      }

      setLoading(false);
    }
    void load();
  }, [threadId, navigate]);

  // Realtime: append new messages for this thread
  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const incoming = payload.new as Msg;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          );
          // mark read if I'm the recipient
          if (incoming.recipient_id === me) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", incoming.id);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId, me]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!threadId) return;
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    const { error } = await supabase.rpc("send_message", {
      p_thread_id: threadId,
      p_body: body,
    });
    setSending(false);

    if (error) {
      setError(error.message);
      return;
    }
    setDraft("");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <p className="mx-auto max-w-3xl text-gray-500">Loading conversation…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-8">
      <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-3xl flex-col rounded-2xl border border-gray-200 bg-white">

        <header className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Link to="/messages" className="text-gray-500 hover:text-gray-900">
              ←
            </Link>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9EEFB] font-semibold text-[#0B5FFF]">
              {(otherName ?? "?")[0]?.toUpperCase() ?? "?"}
            </span>
            <p className="font-semibold text-gray-900">{otherName ?? "User"}</p>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-gray-500">
              No messages yet. Say hello 👋
            </p>
          )}

          {messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div
                key={m.id}
                className={mine ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    mine
                      ? "max-w-[75%] rounded-2xl bg-[#0B5FFF] px-4 py-2 text-white"
                      : "max-w-[75%] rounded-2xl bg-gray-100 px-4 py-2 text-gray-900"
                  }
                >
                  <p className="whitespace-pre-line text-sm">{m.body}</p>
                  <p
                    className={
                      mine
                        ? "mt-1 text-right text-[10px] text-blue-100"
                        : "mt-1 text-right text-[10px] text-gray-500"
                    }
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="border-t border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex items-end gap-2 border-t border-gray-200 p-3">
          <textarea
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2 focus:border-[#0B5FFF] focus:outline-none"
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sending) void send();
              }
            }}
          />
          <button
            onClick={() => void send()}
            disabled={sending || draft.trim().length === 0}
            className="rounded-xl bg-[#0B5FFF] px-5 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}