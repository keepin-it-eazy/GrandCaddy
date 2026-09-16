// src/pages/SignUp.tsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { User, Mail } from "lucide-react";

import Hero from "../components/Hero";
import Toggle from "../components/Toggle";
import Input from "../components/Input";
import PasswordInput from "../components/PasswordInput";
import Button from "../components/Button";
import { signUp, type Role } from "../lib/auth";

export default function SignUp() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError("");

    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      await signUp(email, password, fullName, role);
      alert("Account created successfully! 🎉");
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FC]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        <section className="flex items-center px-12 py-16">
          <Hero />
        </section>

        <section className="flex items-center justify-center px-8 py-16">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h1 className="text-4xl font-bold">Create Your Account</h1>
              <p className="mt-2 text-gray-500">
                Join GrandCaddy and start connecting today.
              </p>
            </div>

            <Toggle value={role} onChange={setRole} />

            <Input
              label="Full Name"
              placeholder="Enter your full name"
              icon={User}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Input
              label="Email Address"
              placeholder="Enter your email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <PasswordInput
              label="Password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-100 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button onClick={() => { if (!loading) void handleSubmit(); }}>
              {loading ? "Creating account…" : "Create Account →"}
            </Button>

            <p className="text-center text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-[#0B5FFF] hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}