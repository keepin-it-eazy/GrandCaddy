// src/pages/Login.tsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Mail } from "lucide-react";

import Hero from "../components/Hero";
import Input from "../components/Input";
import PasswordInput from "../components/PasswordInput";
import Button from "../components/Button";
import { signIn } from "../lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
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
              <h1 className="text-4xl font-bold">Welcome Back</h1>
              <p className="mt-2 text-gray-500">
                Sign in to your GrandCaddy account.
              </p>
            </div>

            <Input
              label="Email Address"
              placeholder="Enter your email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-100 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button onClick={() => { if (!loading) void handleSubmit(); }}>
              {loading ? "Signing in…" : "Sign In →"}
            </Button>

            <p className="text-center text-gray-500">
              Don't have an account?{" "}
              <Link to="/signup" className="font-semibold text-[#0B5FFF] hover:underline">
                Sign up
              </Link>
            </p>

          </div>
        </section>
      </div>
    </main>
  );
}