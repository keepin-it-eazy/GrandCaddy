import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Props = {
  initialPhone: string;
  onVerified: (phone: string) => void;
};

const fieldClass = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-[#0B5FFF] focus:outline-none focus:ring-1 focus:ring-[#0B5FFF]";

export default function PhoneVerification({ initialPhone, onVerified }: Props) {
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active || !user) return;
      if (user.phone_confirmed_at && user.phone) {
        setVerified(true);
        setPhone(user.phone);
        onVerified(user.phone);
      }
    });
    return () => { active = false; };
  }, [onVerified]);

  const sendCode = async () => {
    setError("");
    setMessage("");
    const normalizedPhone = phone.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError("Enter a valid phone number in international format, e.g. +27821234567.");
      return;
    }

    setSending(true);
    const { error: updateError } = await supabase.auth.updateUser({ phone: normalizedPhone });
    setSending(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage("Verification code sent by SMS. It may take a minute to arrive.");
  };

  const verifyCode = async () => {
    setError("");
    setMessage("");
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your SMS.");
      return;
    }

    setChecking(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: code.trim(),
      type: "phone_change",
    });
    if (verifyError || !data.user) {
      setChecking(false);
      setError(verifyError?.message ?? "Could not verify this phone number.");
      return;
    }

    const verifiedPhone = data.user.phone ?? phone.trim();
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ phone: verifiedPhone })
      .eq("id", data.user.id);
    setChecking(false);
    if (profileError) {
      setError("Phone verified, but your profile could not be updated. Reload and try again.");
      return;
    }

    setPhone(verifiedPhone);
    setVerified(true);
    setMessage("Phone number verified.");
    onVerified(verifiedPhone);
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">🛡️</span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Phone verification</h2>
          <p className="mt-1 text-sm text-gray-500">Verify your number by SMS. Payments require a verified phone and confirmed email.</p>
        </div>
      </div>

      {verified ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-800">✓ Verified</p>
          <p className="mt-1 text-sm text-green-700">{phone}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700" htmlFor="verification-phone">Mobile number</label>
          <input
            id="verification-phone"
            className={fieldClass}
            type="tel"
            autoComplete="tel"
            placeholder="+27821234567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={sending}
            className="rounded-xl border border-[#0B5FFF] px-4 py-2 font-semibold text-[#0B5FFF] disabled:opacity-60"
          >
            {sending ? "Sending code…" : "Send verification code"}
          </button>
          {message.includes("sent") && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700" htmlFor="verification-code">SMS code</label>
              <input
                id="verification-code"
                className={fieldClass}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              />
              <button
                type="button"
                onClick={() => void verifyCode()}
                disabled={checking}
                className="rounded-xl bg-[#0B5FFF] px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                {checking ? "Verifying…" : "Verify phone"}
              </button>
            </div>
          )}
        </div>
      )}

      {message && !message.includes("sent") && <p className="mt-3 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
