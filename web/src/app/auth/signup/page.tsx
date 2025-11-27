"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GlassCard from "@/ui/GlassCard";
import { signUpWithEmail } from "../actions";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      await signUpWithEmail(email, password, name);
      setSuccess(true);

      // Redirect to login after 1.5s
      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6 min-h-screen flex items-center justify-center">
      <GlassCard accent="violet" className="w-full">
        <h1 className="text-2xl font-semibold mb-2">Create Account</h1>
        <p className="text-sm text-slate-600 mb-6">
          Sign up to get started with Dear Days
        </p>

        {success ? (
          <div className="text-green-600 text-sm">
            ✅ Account created! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-violet-500 text-white py-2 font-medium disabled:opacity-50"
            >
              {loading ? "Creating..." : "Sign Up"}
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-slate-600 mb-3">
            Already have an account?
          </p>
          <Link
            href="/auth/login"
            className="block text-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Sign In
          </Link>
        </div>
      </GlassCard>
    </main>
  );
}
