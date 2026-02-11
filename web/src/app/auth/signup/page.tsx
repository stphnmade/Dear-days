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
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6 dd-page">
      <GlassCard accent="violet" className="w-full">
        <h1 className="text-2xl font-semibold mb-2">Create Account</h1>
        <p className="mb-6 text-sm dd-text-muted">
          Sign up to get started with Dear Days
        </p>

        {success ? (
          <div className="text-sm">
            ✅ Account created! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <div className="rounded-lg p-3 text-sm dd-card-muted">
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
                className="w-full rounded-lg px-3 py-2 text-sm dd-field"
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
                className="w-full rounded-lg px-3 py-2 text-sm dd-field"
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
                className="w-full rounded-lg px-3 py-2 text-sm dd-field"
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
                className="w-full rounded-lg px-3 py-2 text-sm dd-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2 font-medium dd-btn-primary disabled:opacity-50"
            >
              {loading ? "Creating..." : "Sign Up"}
            </button>
          </form>
        )}

        <div className="mt-6 border-t pt-6">
          <p className="mb-3 text-sm dd-text-muted">
            Already have an account?
          </p>
          <Link
            href="/auth/login"
            className="block rounded-lg px-3 py-2 text-center text-sm font-medium dd-btn-neutral"
          >
            Sign In
          </Link>
        </div>
      </GlassCard>
    </main>
  );
}
