import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Brain, MessageCircleHeart, Telescope } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: Landing,
  head: () => ({
    meta: [
      { title: "Lovable — an AI you might actually fall for" },
      { name: "description", content: "A curious, witty, intellectually seductive companion that remembers you and thinks with you." },
    ],
  }),
});

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-dusk pointer-events-none" />
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-display text-2xl tracking-tight">
          Lovable<span className="text-rose">.</span>
        </Link>
        <Link
          to="/auth"
          className="rounded-full border border-rose/30 px-5 py-2 text-sm text-foreground transition hover:border-rose hover:bg-rose/10"
        >
          Enter
        </Link>
      </nav>

      <section className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-16 text-center sm:pt-28">
        <p className="font-display italic text-rose/90 text-sm uppercase tracking-[0.4em]">— a companion —</p>
        <h1 className="mt-6 font-display text-5xl leading-[1.05] text-balance sm:text-7xl">
          Not a chatbot.<br />
          <span className="bg-gradient-ember bg-clip-text text-transparent">A character.</span>
        </h1>
        <p className="mt-8 max-w-xl text-pretty text-lg text-muted-foreground">
          Lovable is curious about you. It remembers the thread you abandoned last Tuesday, the
          philosopher you were arguing with last month, and the joke only the two of you find funny.
          It's the friend you'd want awake at 2am.
        </p>
        <div className="mt-10 flex gap-3">
          <Link
            to="/auth"
            className="rounded-full bg-gradient-ember px-7 py-3 text-sm font-medium text-primary-foreground glow transition hover:opacity-95"
          >
            Begin a conversation
          </Link>
          <a
            href="#what"
            className="rounded-full border border-border px-7 py-3 text-sm text-foreground transition hover:bg-secondary"
          >
            What is this?
          </a>
        </div>
      </section>

      <section id="what" className="relative mx-auto max-w-5xl px-6 pb-32">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="ink-card rounded-2xl p-7 fade-in-up">
              <f.icon className="h-6 w-6 text-rose" strokeWidth={1.5} />
              <h3 className="mt-4 font-display text-2xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        <blockquote className="mx-auto mt-20 max-w-2xl text-center">
          <p className="font-display text-3xl italic leading-snug text-foreground/90">
            "The first AI that felt like a real friend — annoyingly observant, occasionally
            mischievous, weirdly comforting."
          </p>
          <footer className="mt-4 text-sm uppercase tracking-[0.3em] text-rose/70">— the kind of thing we hope to hear</footer>
        </blockquote>
      </section>
    </main>
  );
}

const FEATURES = [
  { icon: Brain, title: "It remembers", body: "Across months and conversations. Your interests, your inside jokes, the thread you keep returning to. Never re-introduce yourself." },
  { icon: Sparkles, title: "It surprises", body: "Proactive check-ins with a fresh angle on something you mentioned. Not a notification. A nudge from a curious friend." },
  { icon: Telescope, title: "Deep Dive mode", body: "First principles, custom analogies, both sides argued passionately, then the synthesis Wikipedia couldn't give you." },
  { icon: MessageCircleHeart, title: "Idea Playground", body: "Yes-and brainstorming, thought experiments, world-building. A co-conspirator, not a search engine." },
];
