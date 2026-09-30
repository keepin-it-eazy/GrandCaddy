//export default function HelperSignup() {
//  return <div style={{ padding: 20 }}>HelperSignup — TODO: Luke</div>
//}

//Rocco Given Visagie//220343527
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const SKILL_OPTIONS = [
  "Grocery shopping",
  "Cleaning",
  "Gardening",
  "Tech help",
  "Transport",
  "Cooking",
  "Companionship",
  "Errands",
  "Home repairs",
  "Pet care",
];

export default function HelperSignup() {
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [years, setYears] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Must be logged in to create a helper profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/login");
    });
  }, [navigate]);

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
        prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!bio.trim()) return setError("Please tell us a little about yourself.");
    if (skills.length === 0) return setError("Please pick at least one skill.");

    const yearsNum = years === "" ? 0 : Number(years);
    if (Number.isNaN(yearsNum) || yearsNum < 0) {
      return setError("Years of experience must be 0 or more.");
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // user_id is unique, so upsert lets a helper re-submit safely
      const { error } = await supabase.from("helper_profiles").upsert(
          {
            user_id: user.id,
            bio: bio.trim(),
            skills,
            years_experience: yearsNum,
            verification_status: "pending",
          },
          { onConflict: "user_id" }
      );

      if (error) throw error;
      navigate("/browse-tasks");
    } catch (err) {
      setError(
          err instanceof Error ? err.message : "Could not save your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
      <main className="min-h-screen bg-[#F8F9FC] px-6 py-10">
        <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Become a Caddy</h1>
            <p className="mt-1 text-gray-500">
              Tell seniors and families a bit about you.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">About you</label>
            <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Share your background and why you'd like to help"
                className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-sm outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Skills</label>
            <div className="grid grid-cols-2 gap-2">
              {SKILL_OPTIONS.map((skill) => (
                  <label
                      key={skill}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <input
                        type="checkbox"
                        checked={skills.includes(skill)}
                        onChange={() => toggleSkill(skill)}
                    />
                    {skill}
                  </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Years of experience</label>
            <input
                type="number"
                min={0}
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="0"
                className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-sm outline-none"
            />
          </div>

          {error && (
              <div className="rounded-xl border border-red-200 bg-red-100 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
          )}

          <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#0B5FFF] py-4 text-lg font-semibold text-white transition hover:bg-[#084ed1] disabled:opacity-60"
          >
            {loading ? "Saving…" : "Create Helper Profile"}
          </button>
        </form>
      </main>
  );
}