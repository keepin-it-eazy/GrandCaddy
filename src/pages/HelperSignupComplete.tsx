
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import PhoneVerification from "../components/PhoneVerification";
import { KUILS_RIVER_AREAS } from "../lib/areas";

type Category = { id: string; name: string };

const fieldClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#0B5FFF] focus:outline-none focus:ring-1 focus:ring-[#0B5FFF]";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export default function HelperSignup() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [suburb, setSuburb] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [startingIdentityCheck, setStartingIdentityCheck] = useState(false);
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null);
  const [idDocumentName, setIdDocumentName] = useState<string>("");
  const [uploadingId, setUploadingId] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [{ data: cats, error: catError }, { data: auth }] = await Promise.all([
        supabase.from("task_categories").select("id, name").order("name"),
        supabase.auth.getUser(),
      ]);

      if (catError) setError(catError.message);
      else setCategories(cats ?? []);

      const user = auth?.user;
      if (!user) {
        setError("Sign in to set up your Caddy profile.");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      const { data: helperProfile } = await supabase
        .from("helper_profiles")
        .select("suburb, bio, hourly_rate, verification_status")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? "");
        setPhone(profile.phone ?? "");
        setPhoneVerified(Boolean(profile.phone) && Boolean(user.phone_confirmed_at));
        setSuburb(helperProfile?.suburb ?? "");
        setBio(helperProfile?.bio ?? "");
        setVerificationStatus(helperProfile?.verification_status ?? null);
        setHourlyRate(
          helperProfile?.hourly_rate === null || helperProfile?.hourly_rate === undefined
            ? ""
            : String(helperProfile.hourly_rate)
        );
      } else {
        setFullName((user.user_metadata?.full_name as string) ?? "");
      }

      setLoading(false);
    }

    void load();
  }, []);

  const toggleCategory = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setError("");

    if (!fullName || !phone || !suburb) {
      setError("Fill in your name, phone number and suburb.");
      return;
    }

    if (!phoneVerified) {
      setError("Verify your phone number before saving your helper profile.");
      return;
    }

    if (!idDocumentUrl) {
      setError("Upload a copy of your ID before your application can be reviewed.");
      return;
    }

    if (selected.length === 0) {
      setError("Pick at least one kind of task you can help with.");
      return;
    }

    const rate = hourlyRate === "" ? null : Number(hourlyRate);
    if (rate !== null && (Number.isNaN(rate) || rate <= 0)) {
      setError("Enter an hourly rate greater than zero, or leave it blank.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("Your session expired. Sign in again to save your profile.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      phone,
    });

    if (profileError) {
      setSaving(false);
      setError(profileError.message);
      return;
    }

    const { error: helperProfileError } = await supabase.from("helper_profiles").upsert({
      user_id: user.id,
      suburb,
      bio: bio || null,
      hourly_rate: rate,
      is_available: true,
      verification_status: "pending_identity_review",
    });

    if (helperProfileError) {
      setSaving(false);
      setError(helperProfileError.message);
      return;
    }

    await supabase.from("helper_categories").delete().eq("helper_id", user.id);

    const { error: catError } = await supabase.from("helper_categories").insert(
      selected.map((categoryId) => ({
        helper_id: user.id,
        category_id: categoryId,
      }))
    );

    if (catError) {
      setSaving(false);
      setError(catError.message);
      return;
    }

    const { error: identityRecordError } = await supabase.from("helper_identity_checks").upsert({
      helper_id: user.id,
      verification_provider: "stripe_identity",
      identity_status: "processing",
      approval_status: "pending",
      id_document_url: idDocumentUrl,
      id_document_name: idDocumentName || "uploaded-id",
      updated_at: new Date().toISOString(),
    }, { onConflict: "helper_id" });

    if (identityRecordError) {
      setSaving(false);
      setError(identityRecordError.message);
      return;
    }

    setSaving(false);

    try {
      setStartingIdentityCheck(true);
      const { data, error: identitySessionError } = await supabase.functions.invoke("stripe-identity-session", {
        body: { helper_id: user.id },
      });
      setStartingIdentityCheck(false);

      if (identitySessionError) {
        setError(`Profile saved, but identity verification could not start. ${identitySessionError.message}`);
        return;
      }

      const verificationUrl = (data as { url?: string } | null)?.url;
      if (verificationUrl) {
        window.location.href = verificationUrl;
        return;
      }
    } catch (identityStartError) {
      setStartingIdentityCheck(false);
      setError(identityStartError instanceof Error ? identityStartError.message : "Identity verification could not be started.");
      return;
    }

    navigate("/helper");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
        <p className="mx-auto max-w-xl text-gray-500">Loading your profile…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FC] px-6 py-12">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Set up your Caddy profile</h1>
          <p className="mt-1 text-gray-500">
            Customers see this when deciding who to book.
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
          <div>
            <label className={labelClass} htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              className={fieldClass}
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <PhoneVerification
            initialPhone={phone}
            onVerified={(verifiedPhone) => {
              setPhone(verifiedPhone);
              setPhoneVerified(true);
            }}
          />

          <div>
            <label className={labelClass} htmlFor="suburb">
              Area you work in
            </label>
            <select
              id="suburb"
              className={fieldClass}
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
            >
              <option value="">Choose your area</option>
              {KUILS_RIVER_AREAS.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div>
            <span className={labelClass}>What can you help with?</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = selected.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleCategory(c.id)}
                    className={
                      on
                        ? "rounded-full bg-[#0B5FFF] px-4 py-2 text-sm font-medium text-white"
                        : "rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-gray-400"
                    }
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="bio">
              About you
            </label>
            <textarea
              id="bio"
              rows={4}
              className={fieldClass}
              placeholder="A few lines about your experience and how you like to work."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="rate">
              Hourly rate (R, optional)
            </label>
            <input
              id="rate"
              type="number"
              min="0"
              step="10"
              className={fieldClass}
              placeholder="120"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </div>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
            <label className={labelClass} htmlFor="id-upload">
              Upload your ID for admin review
            </label>
            <input
              id="id-upload"
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  setError("Please upload an ID image smaller than 5MB.");
                  return;
                }
                setUploadingId(true);
                const reader = new FileReader();
                reader.onload = () => {
                  setIdDocumentUrl(String(reader.result));
                  setIdDocumentName(file.name);
                  setUploadingId(false);
                  setError("");
                };
                reader.onerror = () => {
                  setUploadingId(false);
                  setError("The ID file could not be read. Please try again.");
                };
                reader.readAsDataURL(file);
              }}
              className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#0B5FFF] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            {idDocumentName && (
              <p className="mt-3 text-sm text-green-700">✓ {idDocumentName} uploaded and ready for review.</p>
            )}
            {uploadingId && <p className="mt-3 text-sm text-blue-700">Uploading ID…</p>}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-100 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {startingIdentityCheck && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">Starting your identity review. You will be redirected to Stripe to complete the check.</p>
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
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </main>
  );
}
