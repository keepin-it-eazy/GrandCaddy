import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { User, Mail } from "lucide-react";

type Category = { id: number; name: string };

const fieldClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#0B5FFF] focus:outline-none focus:ring-1 focus:ring-[#0B5FFF]";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export default function PostTask() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [offeredAmount, setOfferedAmount] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("task_categories")
        .select("id, name")
        .order("name");

      if (error) setError(error.message);
      else setCategories(data ?? []);
    }
    void loadCategories();
  }, []);

  const handleSubmit = async () => {
    setError("");

    if (!title || !description || !categoryId || !suburb || !offeredAmount) {
      setError("Fill in the title, description, category, suburb and amount.");
      return;
    }

    const amount = Number(offeredAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setError("Sign in again to post a task.");
      return;
    }

    const { error: insertError } = await supabase.from("tasks").insert({
      title,
      description,
      category_id: Number(categoryId),
      address: address || null,
      suburb,
      preferred_date: preferredDate || null,
      preferred_time: preferredTime || null,
      offered_amount: amount,
      customer_id: user.id,
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
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Post a task</h1>
          <p className="mt-1 text-gray-500">
            Describe what you need and a Caddy nearby can pick it up.
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
          <div>
            <label className={labelClass} htmlFor="title">
              Title
            </label>
            <input
              id="title"
              className={fieldClass}
              placeholder="Collect groceries from Checkers"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              className={fieldClass}
              placeholder="What needs doing, and anything the Caddy should know."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="category">
              Category
            </label>
            <select
              id="category"
              className={fieldClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="address">
              Address
            </label>
            <input
              id="address"
              className={fieldClass}
              placeholder="12 Main Road"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="suburb">
              Suburb
            </label>
            <input
              id="suburb"
              className={fieldClass}
              placeholder="Paarl North"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="date">
                Preferred date
              </label>
              <input
                id="date"
                type="date"
                className={fieldClass}
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="time">
                Preferred time
              </label>
              <input
                id="time"
                type="time"
                className={fieldClass}
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="amount">
              Offered amount (R)
            </label>
            <input
              id="amount"
              type="number"
              min="0"
              step="10"
              className={fieldClass}
              placeholder="150"
              value={offeredAmount}
              onChange={(e) => setOfferedAmount(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-100 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (!saving) void handleSubmit();
            }}
            className="w-full rounded-xl bg-[#0B5FFF] py-3 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Posting…" : "Post task"}
          </button>
        </div>
      </div>
    </main>
  );
}
