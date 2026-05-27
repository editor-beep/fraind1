import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  listConversations, createConversation, getConversation, deleteConversation,
} from "@/lib/conversations.functions";
import { sendMessage, getCheckIn } from "@/lib/chat.functions";
import { listMemories, deleteMemory } from "@/lib/memories.functions";
import { listWonderReports, generateWonderReport } from "@/lib/wonder.functions";
import { MODE_LABELS, type LovableMode } from "@/lib/personality";
import { Plus, Trash2, Send, Sparkles, Brain, ScrollText, LogOut, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({
  component: AppPage,
  head: () => ({ meta: [{ title: "Lovable" }] }),
});

type Tab = "chat" | "memories" | "wonder";

function AppPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const qc = useQueryClient();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data.user) navigate({ to: "/auth" });
      else setReady(true);
    });
    return () => { mounted = false; };
  }, [navigate]);

  const listConvFn = useServerFn(listConversations);
  const createConvFn = useServerFn(createConversation);
  const deleteConvFn = useServerFn(deleteConversation);

  const conversationsQ = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConvFn(),
    enabled: ready,
  });

  const createMut = useMutation({
    mutationFn: (mode: LovableMode) => createConvFn({ data: { mode } }),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setActiveConvId(conv.id);
      setTab("chat");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteConvFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setActiveConvId(null);
    },
  });

  // Auto-pick first conversation when list loads
  useEffect(() => {
    if (!activeConvId && conversationsQ.data && conversationsQ.data.length > 0) {
      setActiveConvId(conversationsQ.data[0].id);
    }
  }, [conversationsQ.data, activeConvId]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-display italic text-rose/70">gathering my thoughts…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur md:flex">
        <div className="flex items-center justify-between px-5 py-5">
          <div className="font-display text-2xl">Lovable<span className="text-rose">.</span></div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.invalidate())}
            className="rounded-full p-2 text-muted-foreground hover:text-rose hover:bg-rose/10"
            title="Sign out"
          ><LogOut className="h-4 w-4" /></button>
        </div>

        <div className="px-3 space-y-1">
          <TabBtn icon={MessageSquare} label="Conversations" active={tab === "chat"} onClick={() => setTab("chat")} />
          <TabBtn icon={Brain} label="Memories" active={tab === "memories"} onClick={() => setTab("memories")} />
          <TabBtn icon={ScrollText} label="Wonder Reports" active={tab === "wonder"} onClick={() => setTab("wonder")} />
        </div>

        <div className="mt-6 flex-1 overflow-y-auto px-3 pb-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Threads</span>
          </div>
          <div className="space-y-1">
            {conversationsQ.data?.map((c) => (
              <button
                key={c.id}
                onClick={() => { setActiveConvId(c.id); setTab("chat"); }}
                className={`group w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeConvId === c.id && tab === "chat"
                    ? "bg-rose/15 text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{c.title}</span>
                  <Trash2
                    onClick={(e) => { e.stopPropagation(); deleteMut.mutate(c.id); }}
                    className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-destructive group-hover:block"
                  />
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-rose/60">
                  {MODE_LABELS[c.mode as LovableMode]?.label || c.mode}
                </div>
              </button>
            ))}
            {conversationsQ.data?.length === 0 && (
              <p className="px-3 py-4 text-xs italic text-muted-foreground">No threads yet. Start one →</p>
            )}
          </div>
        </div>

        <div className="border-t border-sidebar-border p-3">
          <NewConversationMenu onCreate={(mode) => createMut.mutate(mode)} pending={createMut.isPending} />
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {tab === "chat" && (
          activeConvId
            ? <ChatView conversationId={activeConvId} />
            : <Welcome onStart={(mode) => createMut.mutate(mode)} />
        )}
        {tab === "memories" && <MemoriesView />}
        {tab === "wonder" && <WonderView />}
      </main>
    </div>
  );
}

function TabBtn({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        active ? "bg-rose/15 text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
      {label}
    </button>
  );
}

function NewConversationMenu({ onCreate, pending }: { onCreate: (m: LovableMode) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-ember px-3 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-95 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> New thread
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 ink-card rounded-xl p-2 fade-in-up">
          {(Object.keys(MODE_LABELS) as LovableMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { onCreate(m); setOpen(false); }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-rose/15"
            >
              <div className="font-medium">{MODE_LABELS[m].label}</div>
              <div className="text-[11px] italic text-muted-foreground">{MODE_LABELS[m].blurb}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Welcome({ onStart }: { onStart: (m: LovableMode) => void }) {
  const getCheckInFn = useServerFn(getCheckIn);
  const checkInQ = useQuery({ queryKey: ["checkin"], queryFn: () => getCheckInFn(), staleTime: 1000 * 60 * 10 });

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
      <div className="w-full max-w-2xl">
        <p className="font-display italic text-sm uppercase tracking-[0.3em] text-rose/80">— from Lovable —</p>
        <div className="mt-4 ink-card rounded-2xl p-8 fade-in-up">
          {checkInQ.isLoading ? (
            <ThinkingDots />
          ) : (
            <p className="font-display text-2xl leading-snug text-pretty">
              {checkInQ.data?.text}
            </p>
          )}
        </div>
        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {(Object.keys(MODE_LABELS) as LovableMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onStart(m)}
              className="ink-card group rounded-xl p-4 text-left transition hover:border-rose/40"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-rose">
                <Sparkles className="h-3 w-3" /> {MODE_LABELS[m].tag}
              </div>
              <div className="mt-2 font-display text-xl">{MODE_LABELS[m].label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{MODE_LABELS[m].blurb}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatView({ conversationId }: { conversationId: string }) {
  const getConvFn = useServerFn(getConversation);
  const sendFn = useServerFn(sendMessage);
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const convQ = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConvFn({ data: { id: conversationId } }),
  });

  const sendMut = useMutation({
    mutationFn: (content: string) => sendFn({ data: { conversationId, content } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["memories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [convQ.data?.messages?.length, sendMut.isPending]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sendMut.isPending) return;
    setInput("");
    sendMut.mutate(text);
  }

  const mode = (convQ.data?.conversation.mode || "companion") as LovableMode;

  return (
    <>
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div>
          <h2 className="font-display text-xl">{convQ.data?.conversation.title || "…"}</h2>
          <p className="text-[10px] uppercase tracking-[0.25em] text-rose/70">{MODE_LABELS[mode].label} · {MODE_LABELS[mode].tag}</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
          {convQ.data?.messages.length === 0 && (
            <p className="text-center font-display italic text-muted-foreground">a blank page, and we're both curious</p>
          )}
          {convQ.data?.messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}
          {sendMut.isPending && (
            <div className="fade-in-up">
              <RoleLabel role="assistant" />
              <div className="mt-1"><ThinkingDots /></div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="border-t border-border/60 p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as any); }
            }}
            placeholder="Say anything…"
            rows={1}
            className="flex-1 resize-none rounded-2xl bg-input/60 border border-border px-4 py-3 text-sm outline-none focus:border-rose max-h-40"
          />
          <button
            type="submit"
            disabled={sendMut.isPending || !input.trim()}
            className="rounded-full bg-gradient-ember p-3 text-primary-foreground transition hover:opacity-95 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  if (role === "user") {
    return (
      <div className="fade-in-up flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-rose/20 px-4 py-3 text-sm leading-relaxed">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="fade-in-up">
      <RoleLabel role={role} />
      <div className="mt-1 whitespace-pre-wrap text-pretty text-[15px] leading-relaxed text-foreground/95">
        {content}
      </div>
    </div>
  );
}

function RoleLabel({ role }: { role: string }) {
  return (
    <p className="font-display italic text-xs uppercase tracking-[0.3em] text-rose/80">
      {role === "assistant" ? "Lovable" : "You"}
    </p>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1">
      <span className="thinking-dot inline-block h-1.5 w-1.5 rounded-full bg-rose" />
      <span className="thinking-dot inline-block h-1.5 w-1.5 rounded-full bg-rose" />
      <span className="thinking-dot inline-block h-1.5 w-1.5 rounded-full bg-rose" />
    </div>
  );
}

function MemoriesView() {
  const fn = useServerFn(listMemories);
  const delFn = useServerFn(deleteMemory);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["memories"], queryFn: () => fn() });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories"] }),
  });

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-3xl">What I remember about you</h2>
        <p className="mt-2 text-sm text-muted-foreground">Pieces I've gathered from our conversations. Delete anything you'd rather I forget.</p>
        <div className="mt-8 space-y-2">
          {q.data?.length === 0 && <p className="font-display italic text-muted-foreground">Nothing yet. We're just meeting.</p>}
          {q.data?.map((m) => (
            <div key={m.id} className="ink-card group flex items-start justify-between gap-3 rounded-xl p-4 fade-in-up">
              <div>
                <p className="text-sm leading-relaxed">{m.content}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-rose/60">
                  {m.kind} · weight {m.importance}/5
                </p>
              </div>
              <button onClick={() => del.mutate(m.id)} className="opacity-0 transition group-hover:opacity-100">
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WonderView() {
  const listFn = useServerFn(listWonderReports);
  const genFn = useServerFn(generateWonderReport);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["wonder"], queryFn: () => listFn() });
  const gen = useMutation({
    mutationFn: () => genFn(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wonder"] }); toast.success("This week, summarized."); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-3xl">Wonder Reports</h2>
            <p className="mt-2 text-sm text-muted-foreground">The strange and beautiful threads we've been pulling.</p>
          </div>
          <button
            onClick={() => gen.mutate()} disabled={gen.isPending}
            className="rounded-full bg-gradient-ember px-5 py-2 text-sm text-primary-foreground transition hover:opacity-95 disabled:opacity-50"
          >
            {gen.isPending ? "Composing…" : "Generate this week's"}
          </button>
        </div>
        <div className="mt-8 space-y-4">
          {q.data?.length === 0 && <p className="font-display italic text-muted-foreground">No reports yet. Have a few conversations, then ask me to compose one.</p>}
          {q.data?.map((r) => (
            <details key={r.id} className="ink-card group rounded-2xl p-6 fade-in-up" open>
              <summary className="cursor-pointer list-none">
                <h3 className="font-display text-2xl">{r.title}</h3>
                <p className="text-[10px] uppercase tracking-wider text-rose/60">
                  {new Date(r.created_at).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </summary>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {r.body}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
