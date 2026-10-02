// src/pages/PostTask.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { TaskUrgency, TimeSlot } from "../types/task";

type Category = { id: number; name: string; icon: string | null };

const fieldClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#0B5FFF] focus:outline-none focus:ring-1 focus:ring-[#0B5FFF]";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

const URGENCY_OPTIONS: { value: TaskUrgency; label: string; hint: string }[] = [
  { value: "flexible", label: "Flexible", hint: "No rush" },
  { value: "today",    label: "Today",    hint: "Within 24h" },
  { value: "urgent",   label: "Urgent",   hint: "ASAP" },
];

const TIME_SLOTS: { value: TimeSlot; label: string; range: string }[] = [
  { value: "morning",   label: "Morning",   range: "8am – 12pm" },
  { value: "afternoon", label: "Afternoon", range: "12pm – 5pm" },
  { value: "evening",   label: "Evening",   range: "5pm – 9pm" },
];

const BUDGET_PRESETS = [
  { value: 250,  label: "R250 – R450",   hint: "Basic" },
  { value: 600,  label: "R450 – R1000",  hint: "Popular" },
  { value: 1500, label: "R1000 – R2500", hint: "Premium" },
];

export default function PostTask() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [urgency, setUrgency] = useState<TaskUrgency>("flexible");
  const [preferredDate, setPreferredDate] = useState("");
  const [timeSlot, setTimeSlot] = useState<TimeSlot | "">("");
  const [budget, setBudget] = useState<number>(600);
  const [customBudget, setCustomBudget] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceNote, setRecurrenceNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("task_categories")
        .select("id, name, icon")
        .order("name");
      if (error) setError(error.message);
      else setCategories(data ?? []);
    }
    void loadCategories();
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId]
  );

  const effectiveBudget = customBudget ? Number(customBudget) : budget;

  const handleAddPhoto = () => {
    const url = photoInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError("Photo URL must start with http:// or https://");
      return;
    }
    setPhotos((p) => [...p, url]);
    setPhotoInput("");
  };

  const handleRemovePhoto = (url: string) => {
    setPhotos((p) => p.filter((u) => u !== url));
  };

  const handleSubmit = async () => {
    setError("");

    if (!title.trim() || !description.trim()) {
      setError("Add a title and description.");
      return;
    }
    if (!categoryId) {
      setError("Pick a category.");
      return;
    }
    if (!suburb.trim()) {
      setError("Add your suburb.");
      return;
    }
    if (!effectiveBudget || effectiveBudget <= 0) {
      setError("Set a budget greater than zero.");
      return;
    }

    setSaving(true);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setSaving(false);
      setError("Sign in again to post a task.");
      return;
    }

    const { error: insertError } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId,
      address: address.trim() || null,
      suburb: suburb.trim(),
      urgency,
      preferred_date: preferredDate || null,
      preferred_time: null,
      preferred_time_slot: timeSlot || null,
      budget: effectiveBudget,
      is_recurring: isRecurring,
      recurrence_note: isRecurring ? recurrenceNote.trim() || null : null,
      photos,
      user_id: user.id,
      status: "open",
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    navigate("/my-tasks");
  };

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[2fr,1fr]">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Post a task</h1>
            <p className="mt-1 text-gray-500">
              Describe what you need and a Caddy nearby can pick it up.
            </p>
          </div>

          {/* 1. Category */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              1. What do you need help with?
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {categories.map((c) => {
                const on = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={
                      on
                        ? "flex flex-col items-center gap-2 rounded-2xl border-2 border-[#0B5FFF] bg-[#E9EEFB] px-3 py-4 text-sm font-medium text-[#0B5FFF]"
                        : "flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-sm font-medium text-gray-700 hover:border-gray-400"
                    }
                  >
                    <span className="text-2xl">{c.icon ?? "🛠️"}</span>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Describe */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">2. Describe your task</h2>

            <div>
              <label className={labelClass} htmlFor="title">Task title</label>
              <input
                id="title"
                className={fieldClass}
                placeholder="e.g. Deep clean 2-bedroom apartment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="description">Description</label>
              <textarea
                id="description"
                rows={4}
                className={fieldClass}
                placeholder="What needs doing, and anything the Caddy should know."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="address">Address (optional)</label>
                <input
                  id="address"
                  className={fieldClass}
                  placeholder="12 Main Road"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="suburb">Location / Suburb</label>
                <select
                  id="suburb"
                  className={fieldClass}
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                >
                  <option value="">Choose your suburb</option>
                  <option value="Paarl North">Paarl North</option>
                  <option value="Paarl Central">Paarl Central</option>
                  <option value="Paarl South">Paarl South</option>
                  <option value="Wellington">Wellington</option>
                  <option value="Stellenbosch">Stellenbosch</option>
                  <option value="Franschhoek">Franschhoek</option>
                </select>
              </div>
            </div>
          </section>

          {/* 3. When */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">3. When do you need it done?</h2>

            <div className="grid grid-cols-3 gap-3">
              {URGENCY_OPTIONS.map((u) => {
                const on = urgency === u.value;
                return (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setUrgency(u.value)}
                    className={
                      on
                        ? "rounded-2xl border-2 border-[#0B5FFF] bg-[#E9EEFB] px-3 py-4 text-left"
                        : "rounded-2xl border border-gray-200 bg-white px-3 py-4 text-left hover:border-gray-400"
                    }
                  >
                    <p className="font-semibold text-gray-900">{u.label}</p>
                    <p className="text-xs text-gray-500">{u.hint}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="date">Preferred date</label>
                <input
                  id="date"
                  type="date"
                  className={fieldClass}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="slot">Duration estimate</label>
                <select
                  id="slot"
                  className={fieldClass}
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value as TimeSlot | "")}
                >
                  <option value="">Any time</option>
                  {TIME_SLOTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} ({s.range})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="recurring"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="recurring" className="text-sm text-gray-700">
                This is a recurring task
              </label>
            </div>
            {isRecurring && (
              <input
                className={fieldClass}
                placeholder="e.g. Every Monday morning"
                value={recurrenceNote}
                onChange={(e) => setRecurrenceNote(e.target.value)}
              />
            )}
          </section>

          {/* 4. Budget */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">4. Set your budget</h2>

            <div className="flex flex-wrap gap-3">
              {BUDGET_PRESETS.map((b) => {
                const on = !customBudget && budget === b.value;
                return (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => {
                      setBudget(b.value);
                      setCustomBudget("");
                    }}
                    className={
                      on
                        ? "rounded-full bg-[#0B5FFF] px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:border-gray-400"
                    }
                  >
                    {b.label} · {b.hint}
                  </button>
                );
              })}
            </div>

            <div>
              <label className={labelClass} htmlFor="custom">Custom amount (R)</label>
              <input
                id="custom"
                type="number"
                min="1"
                className={fieldClass}
                placeholder="e.g. 750"
                value={customBudget}
                onChange={(e) => setCustomBudget(e.target.value)}
              />
            </div>
          </section>

          {/* 5. Photos */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">5. Add photos (optional)</h2>
            <p className="text-sm text-gray-500">
              Paste image URLs. Uploads via file picker can be added later with Supabase Storage.
            </p>
            <div className="flex gap-2">
              <input
                className={fieldClass}
                placeholder="https://..."
                value={photoInput}
                onChange={(e) => setPhotoInput(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                className="rounded-xl bg-[#0B5FFF] px-4 py-3 font-semibold text-white"
              >
                Add
              </button>
            </div>
            {photos.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((url) => (
                  <li key={url} className="relative">
                    <img
                      src={url}
                      alt=""
                      className="h-24 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(url)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-100 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Task summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
            <h3 className="text-base font-semibold text-gray-900">Task summary</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium">{selectedCategory?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Date</dt>
                <dd className="font-medium">{preferredDate || "Flexible"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Time</dt>
                <dd className="font-medium">
                  {timeSlot ? TIME_SLOTS.find((s) => s.value === timeSlot)?.range : "Any"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Location</dt>
                <dd className="font-medium">{suburb || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Urgency</dt>
                <dd className="font-medium capitalize">{urgency}</dd>
              </div>
            </dl>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-500">Your budget</p>
              <p className="text-lg font-bold text-[#0B5FFF]">
                R{effectiveBudget.toLocaleString()} – R
                {Math.round(effectiveBudget * 1.4).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Typical range in Paarl</p>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (!saving) void handleSubmit();
              }}
              className="w-full rounded-xl bg-[#0B5FFF] py-3 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Posting…" : "Post Task & Get Offers"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => navigate("/my-tasks")}
              className="w-full rounded-xl border border-gray-300 bg-white py-3 font-semibold text-gray-700"
            >
              Save as Draft
            </button>
          </div>

          {/* Tips */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
            <h3 className="text-base font-semibold text-gray-900">Tips for a great post</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>📸 Add photos to get up to 3× more offers</li>
              <li>📝 Be specific about what you need done</li>
              <li>💰 Set a fair budget to attract more Caddies</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}