// src/pages/HelperProfile.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type HelperInfo = {
  user_id: string;
  suburb: string | null;
  bio: string | null;
  hourly_rate: number | null;
  is_available: boolean;
  verification_status: string;
  years_experience: number | null;
};

type ProfileInfo = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { full_name: string | null } | { full_name: string | null }[] | null;
};

type Category = { id: number; name: string };

function pick<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function BookingModal({
  helperId, helperName, defaultSuburb, defaultRate, onClose, onBooked,
}: {
  helperId: string;
  helperName: string;
  defaultSuburb: string | null;
  defaultRate: number | null;
  onClose: () => void;
  onBooked: (taskId: number) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [suburb, setSuburb] = useState(defaultSuburb ?? "");
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState<number>(defaultRate ?? 250);
  const [preferredDate, setPreferredDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("task_categories").select("id, name").order("name");
      setCategories(data ?? []);
    })();
  }, []);

  const submit = async () => {
    setError(null);
    if (!title.trim() || !description.trim()) return setError("Add a title and description.");
    if (!suburb.trim()) return setError("Add a suburb.");
    if (!budget || budget <= 0) return setError("Set a budget greater than zero.");

    setSaving(true);
    const { data, error } = await supabase.rpc("book_helper", {
      p_helper_id: helperId,
      p_title: title.trim(),
      p_description: description.trim(),
      p_suburb: suburb.trim(),
      p_address: address.trim() || null,
      p_budget: budget,
      p_preferred_date: preferredDate || null,
      p_category_id: categoryId,
    });
    setSaving(false);

    if (error) return setError(error.message);
    const taskId = (data as any)?.id;
    onBooked(taskId);
  };

  const fieldClass = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#0B5FFF] focus:outline-none focus:ring-1 focus:ring-[#0B5FFF]";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Book {helperName}</h2>
            <p className="mt-1 text-sm text-gray-500">Describe what you need and send the request.</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100" aria-label="Close">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Task title</label>
            <input className={fieldClass} placeholder="e.g. Clean 2-bedroom apartment" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea rows={3} className={fieldClass} placeholder="What needs doing?" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Category (optional)</label>
            <select className={fieldClass} value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Choose a category</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Suburb</label>
              <input className={fieldClass} value={suburb} onChange={(e) => setSuburb(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Address (optional)</label>
              <input className={fieldClass} placeholder="12 Main Road" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Budget (R)</label>
              <input type="number" min="1" className={fieldClass} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelClass}>Preferred date (optional)</label>
              <input type="date" className={fieldClass} value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-100 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-gray-300 bg-white py-3 font-semibold text-gray-700">Cancel</button>
            <button onClick={() => void submit()} disabled={saving} className="flex-1 rounded-xl bg-[#0B5FFF] py-3 font-semibold text-white disabled:opacity-60">
              {saving ? "Sending…" : "Send request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HelperProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [helper, setHelper] = useState<HelperInfo | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasBooking, setHasBooking] = useState(false);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) { setError("No helper id in URL."); setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const [h, p, r, c] = await Promise.all([
        supabase
          .from("helper_profiles")
          .select("user_id, suburb, bio, hourly_rate, is_available, verification_status, years_experience")
          .eq("user_id", id)
          .maybeSingle(),
        supabase.from("profiles").select("id, full_name, phone").eq("id", id).maybeSingle(),
        supabase
          .from("reviews")
          .select("id, rating, comment, created_at, reviewer:reviewer_id ( full_name )")
          .eq("helper_id", id)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("helper_categories").select("task_categories ( name )").eq("helper_id", id),
      ]);

      if (h.error || p.error || r.error || c.error) {
        setError(h.error?.message ?? p.error?.message ?? r.error?.message ?? c.error?.message ?? "Load failed");
        setLoading(false);
        return;
      }
      if (!h.data) { setError("This helper doesn't exist."); setLoading(false); return; }
      if (!p.data) { setError("This helper's profile is missing."); setLoading(false); return; }

      setHelper(h.data);
      setProfile(p.data);
      setReviews((r.data ?? []) as unknown as Review[]);
      setCategories(
        (c.data ?? []).map((row: any) => pick(row.task_categories)).map((cat: any) => cat?.name).filter(Boolean) as string[]
      );

      if (user && user.id !== id) {
        const { data: canMsg } = await supabase.rpc("has_booking_with", { p_other: id });
        setHasBooking(!!canMsg);
      }

      setLoading(false);
    }
    void load();
  }, [id]);

  const initials = (profile?.full_name ?? "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const isSelf = currentUserId !== null && currentUserId === id;

  const openThread = async () => {
    if (!id) return;
    setMessaging(true);
    const { data: threadId, error } = await supabase.rpc("get_or_create_thread", { p_other: id });
    setMessaging(false);

    if (error) { setError(error.message); return; }
    navigate(`/messages/${threadId}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <p className="mx-auto max-w-5xl text-gray-500">Loading helper…</p>
      </main>
    );
  }

  if (error || !helper || !profile) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-100 p-4">
            <p className="text-sm font-semibold text-red-700">Helper profile error</p>
            <p className="mt-1 text-sm text-red-600">{error ?? "Helper not found."}</p>
          </div>
          <Link to="/browse" className="font-semibold text-[#0B5FFF] hover:underline">← Back to tasks</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[340px,1fr]">
        <aside className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#E9EEFB] text-4xl font-bold text-[#0B5FFF]">
              {initials}
            </div>

            <h1 className="mt-4 text-2xl font-bold text-gray-900">{profile.full_name ?? "Helper"}</h1>

            <div className="mt-2 flex items-center justify-center gap-2 text-sm">
              <span className="text-yellow-500">{"★".repeat(5)}</span>
              <span className="font-semibold text-gray-900">{avgRating ?? "New"}</span>
              <span className="text-gray-500">({reviews.length} review{reviews.length === 1 ? "" : "s"})</span>
            </div>

            {helper.bio && (
              <p className="mt-4 text-sm leading-relaxed text-gray-600">Hello! {helper.bio}</p>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={() => setShowBooking(true)}
                disabled={isSelf}
                className="w-full rounded-xl bg-[#0B5FFF] py-3 font-semibold text-white disabled:opacity-60"
              >
                {isSelf ? "This is you" : "Book this Caddy"}
              </button>

              {isSelf ? (
                <button
                  disabled
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 font-semibold text-gray-400"
                >
                  This is you
                </button>
              ) : hasBooking ? (
                <button
                  onClick={() => void openThread()}
                  disabled={messaging}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 font-semibold text-[#0B5FFF] disabled:opacity-60"
                >
                  {messaging ? "Opening…" : "Message Caddy"}
                </button>
              ) : (
                <button
                  disabled
                  title="Book first to unlock messaging"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 font-semibold text-gray-400"
                >
                  Book first to message
                </button>
              )}
            </div>

            {categories.length > 0 && (
              <div className="mt-6 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Specialties</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((name) => (
                    <span key={name} className="rounded-full bg-[#E9EEFB] px-3 py-1 text-xs font-semibold text-[#0B5FFF]">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <dl className="mt-6 space-y-2 text-left text-sm">
              {helper.suburb && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Area</dt>
                  <dd className="font-medium">{helper.suburb}</dd>
                </div>
              )}
              {helper.hourly_rate != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Hourly rate</dt>
                  <dd className="font-medium">R{helper.hourly_rate}</dd>
                </div>
              )}
              {helper.years_experience != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Experience</dt>
                  <dd className="font-medium">{helper.years_experience} yrs</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd className="font-medium capitalize">{helper.is_available ? "Available" : "Offline"}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
            <button className="text-sm font-semibold text-[#0B5FFF] hover:underline">Sort by: Recent</button>
          </div>

          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <p className="text-gray-600">No reviews yet.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {reviews.map((rev) => {
                const reviewer = pick(rev.reviewer);
                const name = reviewer?.full_name ?? "Someone";
                return (
                  <li key={rev.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-700">
                        {name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900">{name}</p>
                          <p className="text-xs text-gray-500">{new Date(rev.created_at).toLocaleDateString()}</p>
                        </div>
                        <p className="text-sm text-yellow-500">
                          {"★".repeat(rev.rating)}
                          <span className="text-gray-300">{"★".repeat(5 - rev.rating)}</span>
                        </p>
                        {rev.comment && <p className="mt-2 text-sm text-gray-700">{rev.comment}</p>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {showBooking && helper && profile && (
        <BookingModal
          helperId={helper.user_id}
          helperName={profile.full_name ?? "this Caddy"}
          defaultSuburb={helper.suburb}
          defaultRate={helper.hourly_rate}
          onClose={() => setShowBooking(false)}
          onBooked={(taskId) => {
            setShowBooking(false);
            navigate(`/tasks/${taskId}`);
          }}
        />
      )}
    </main>
  );
}