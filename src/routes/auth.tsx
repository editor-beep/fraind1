import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Enter the stream engenius" }] }),
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin + "/app",
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome. Check your inbox to confirm — then come back.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-dusk pointer-events-none" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-8 block text-center font-display text-3xl">
          the stream engenius
        </Link>
        <div className="ink-card rounded-2xl p-8">
          <h1 className="font-display text-3xl">
            {mode === "signup" ? "Come in." : "Welcome back."}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "Tell me your name and we'll begin." : "I've been waiting."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <input
                placeholder="What should I call you?"
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-input/60 border border-border px-4 py-2.5 text-sm outline-none focus:border-rose"
              />
            )}
            <input
              type="email" required placeholder="Email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-input/60 border border-border px-4 py-2.5 text-sm outline-none focus:border-rose"
            />
            <input
              type="password" required placeholder="Password" minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-input/60 border border-border px-4 py-2.5 text-sm outline-none focus:border-rose"
            />
            <button
              type="submit" disabled={loading}
              className="w-full rounded-lg bg-gradient-ember px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? "..." : mode === "signup" ? "Begin" : "Continue"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="mt-6 w-full text-center text-xs text-muted-foreground hover:text-rose"
          >
            {mode === "signup" ? "Already know me? Sign in" : "New here? Create an account"}
          </button>
        </div>
      </div>
    </main>
  );
}
