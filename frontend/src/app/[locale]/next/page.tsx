/*
 * app/[locale]/next/page.tsx — What's Next (community roadmap + voting)
 *
 * Responsibilities:
 *   - Display a community submission form (left col, sticky) for new topics
 *   - Display sorted topic list with vote buttons (right col)
 *   - Wire submission to POST /topics (title + description only; email is UI-only)
 *   - Wire voting to POST /votes with anonymous placeholder email
 *   - Optimistic UI: localVoted Set drives gold styling + +1 visual count
 */
"use client";

import { useState, useEffect, CSSProperties } from "react";
import { useTranslations, useLocale } from "next-intl";

/* ── Constants ───────────────────────────────────────────────────────────── */

/** Base URL for all API calls; falls back to Next.js API proxy. */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/* ── Types ───────────────────────────────────────────────────────────────── */

/** Topic as returned by the API. */
interface Topic {
  id:           number;
  title:        string;
  description:  string | null;
  status:       "dev" | "planned" | "open" | string;
  vote_count:   number;
  /** ISO date string or human-readable label for planned releases. */
  release_date?: string | null;
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

/**
 * VoteButton — thumb-up arrow + count, lights gold when the user has voted.
 * @param count   - current vote count to display
 * @param voted   - whether the current user has voted for this topic
 * @param onClick - called when the user clicks to vote / un-vote
 */
function VoteButton({
  count,
  voted,
  onClick,
}: {
  count:   number;
  voted:   boolean;
  onClick: () => void;
}) {
  /* Hover handled inline to avoid external CSS dependency */
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        gap:            6,
        padding:        "14px 12px",
        width:          78,
        borderRadius:   4,
        border:         `1px solid ${voted ? "var(--gold)" : hov ? "rgba(200,168,75,0.5)" : "rgba(200,168,75,0.2)"}`,
        background:     voted ? "rgba(200,168,75,0.12)" : "rgba(0,0,0,0.3)",
        cursor:         "pointer",
        transition:     "all 200ms",
        flexShrink:     0,
      }}
    >
      {/* Upvote / thumbs-up SVG arrow */}
      <svg
        width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={voted ? "var(--gold)" : "var(--cream-dim)"}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M7 10v12"/>
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l4-7a2 2 0 0 1 1.99 1.77L15 5.88z"/>
      </svg>
      <span style={{
        fontFamily:    "var(--mono)",
        fontSize:      13,
        fontWeight:    700,
        color:         voted ? "var(--gold)" : "var(--cream)",
        letterSpacing: "-0.02em",
      }}>
        {count.toLocaleString()}
      </span>
    </button>
  );
}

/**
 * TopicCard — one community topic row with rank badge, vote button, and status.
 * @param topic  - API topic object
 * @param rank   - 1-based position in sorted list
 * @param voted  - whether the current user has voted for this topic
 * @param onVote - called when VoteButton is clicked
 */
function TopicCard({
  topic,
  rank,
  voted,
  onVote,
  t,
}: {
  topic:  Topic;
  rank:   number;
  voted:  boolean;
  onVote: () => void;
  /** Bound useTranslations("whatsNext") instance passed from parent. */
  t: ReturnType<typeof useTranslations>;
}) {
  const isFirst = rank === 1;
  const [hov, setHov] = useState(false);

  /** Compute the optional status badge config for dev/planned statuses. */
  const statusBadge = (): { label: string; color: string; bg: string } | null => {
    if (topic.status === "dev") {
      return {
        label: t("devBadge"),
        color: "#5fb4a2",
        bg:    "rgba(95,180,162,0.12)",
      };
    }
    if (topic.status === "planned" && topic.release_date) {
      return {
        label: `${t("releaseLabel")}: ${topic.release_date}`,
        color: "var(--gold)",
        bg:    "rgba(200,168,75,0.12)",
      };
    }
    return null;
  };

  const badge = statusBadge();

  /* Optimistic visual: add +1 while the API call hasn't returned yet. */
  const displayCount = topic.vote_count + (voted ? 1 : 0);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:     "relative",
        display:      "flex",
        gap:          24,
        padding:      "24px 26px",
        background:   "var(--bg-1)",
        border:       `1px solid ${isFirst ? "var(--gold)" : hov ? "rgba(200,168,75,0.3)" : "rgba(200,168,75,0.1)"}`,
        borderRadius: 6,
        boxShadow:    isFirst
          ? "0 0 40px rgba(200,168,75,0.18)"
          : "0 4px 16px rgba(0,0,0,0.3)",
        transform:    hov ? "translateY(-2px)" : "translateY(0)",
        transition:   "transform 220ms, border-color 220ms",
      }}
    >
      <VoteButton count={displayCount} voted={voted} onClick={onVote} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Rank + badges row */}
        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:          14,
          marginBottom: 8,
          flexWrap:     "wrap",
        }}>
          <span style={{
            fontFamily:    "var(--mono)",
            fontSize:      11,
            color:         isFirst ? "var(--gold)" : "var(--muted-2)",
            letterSpacing: "0.18em",
            fontWeight:    700,
          }}>
            #{String(rank).padStart(2, "0")}
          </span>

          {/* Top choice banner — only on rank 1 */}
          {isFirst && (
            <span style={{
              fontFamily:    "var(--mono)",
              fontSize:      9,
              letterSpacing: "0.3em",
              color:         "var(--gold)",
              padding:       "3px 8px",
              border:        "1px solid var(--gold)",
              borderRadius:  2,
              fontWeight:    700,
            }}>
              {t("topChoice")}
            </span>
          )}

          {/* Status badge for dev/planned topics */}
          {badge && (
            <span style={{
              fontFamily:    "var(--mono)",
              fontSize:      9,
              letterSpacing: "0.24em",
              color:         badge.color,
              padding:       "3px 8px",
              background:    badge.bg,
              border:        `1px solid ${badge.color}55`,
              borderRadius:  2,
              textTransform: "uppercase",
              fontWeight:    600,
            }}>
              ◉ {badge.label}
            </span>
          )}
        </div>

        {/* Topic title */}
        <h3 style={{
          fontFamily:    "var(--serif)",
          fontWeight:    600,
          fontSize:      24,
          color:         "var(--cream)",
          letterSpacing: "0.005em",
          marginBottom:  6,
          lineHeight:    1.15,
        }}>
          {topic.title}
        </h3>

        {/* Topic description */}
        {topic.description && (
          <p style={{
            fontSize:   14,
            color:      "var(--muted)",
            lineHeight: 1.55,
          }}>
            {topic.description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * SubmissionForm — sticky left-column panel for submitting new topic proposals.
 * @param onSubmit - called with the newly created Topic from the API
 */
function SubmissionForm({
  onSubmit,
  t,
}: {
  onSubmit: (topic: Topic) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [title,      setTitle]      = useState("");
  const [desc,       setDesc]       = useState("");
  const [email,      setEmail]      = useState(""); /* UI-only; magic link deferred */
  const [sent,       setSent]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focused,    setFocused]    = useState<"title" | "desc" | "email" | "">("");

  /** Build border colour for a given field based on focus state. */
  const fieldBorder = (name: string) =>
    focused === name ? "var(--gold)" : "rgba(200,168,75,0.15)";

  const fieldBase: CSSProperties = {
    width:       "100%",
    background:  "rgba(0,0,0,0.4)",
    borderRadius: 3,
    padding:     "14px 16px",
    color:       "var(--cream)",
    fontSize:    14,
    fontFamily:  "var(--sans)",
    outline:     "none",
    transition:  "border-color 200ms, background 200ms",
  };

  const labelStyle: CSSProperties = {
    display:       "block",
    fontFamily:    "var(--mono)",
    fontSize:      10,
    letterSpacing: "0.28em",
    textTransform: "uppercase",
    color:         "var(--muted-2)",
    marginBottom:  8,
  };

  /**
   * Submit the topic proposal.
   * POSTs {title, description} to the API; email is not sent (magic link deferred).
   * On success, resets the form and notifies the parent via onSubmit.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim() || !email.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/topics`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        /* email is intentionally omitted from the API body — magic link deferred */
        body: JSON.stringify({ title: title.trim(), description: desc.trim() }),
      });

      if (res.ok) {
        const created: Topic = await res.json();
        setSent(true);
        onSubmit(created);
        /* Reset form and "sent" state after a short delay */
        setTimeout(() => {
          setSent(false);
          setTitle("");
          setDesc("");
          setEmail("");
        }, 4500);
      }
    } catch {
      /* Swallow network errors — could surface a toast in future */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      padding:      "32px 32px 36px",
      background:   "var(--bg-1)",
      border:       "1px solid rgba(200,168,75,0.15)",
      borderRadius: 6,
      position:     "sticky",
      top:          120,
    }}>
      {/* "Submit a topic" mono label */}
      <div style={{
        fontFamily:    "var(--mono)",
        fontSize:      10,
        letterSpacing: "0.32em",
        color:         "var(--gold)",
        marginBottom:  14,
        textTransform: "uppercase",
      }}>
        ▼ {t("submitTopic")}
      </div>

      {/* Panel headline */}
      <h2 style={{
        fontFamily:    "var(--serif)",
        fontSize:      32,
        fontWeight:    600,
        color:         "var(--cream)",
        lineHeight:    1,
        marginBottom:  6,
      }}>
        {t("formTitle")}
      </h2>

      {/* Italic subtitle — magic link note */}
      <p style={{
        fontFamily:   "var(--serif)",
        fontStyle:    "italic",
        fontSize:     15,
        color:        "var(--muted)",
        marginBottom: 28,
        lineHeight:   1.4,
      }}>
        {t("formSubtitle")}
      </p>

      <form onSubmit={handleSubmit}>
        {/* Topic title field */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>{t("topicTitle")}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setFocused("title")}
            onBlur={() => setFocused("")}
            placeholder={t("topicPlaceholderTitle")}
            style={{ ...fieldBase, border: `1px solid ${fieldBorder("title")}` }}
          />
        </div>

        {/* Topic description textarea */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>{t("topicDesc")}</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onFocus={() => setFocused("desc")}
            onBlur={() => setFocused("")}
            rows={4}
            placeholder={t("topicPlaceholderDesc")}
            style={{
              ...fieldBase,
              border:     `1px solid ${fieldBorder("desc")}`,
              resize:     "vertical",
              fontFamily: "var(--sans)",
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Email field — UI only, not sent to API (magic link deferred) */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>{t("topicEmail")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused("")}
            placeholder="ty@example.com"
            style={{ ...fieldBase, border: `1px solid ${fieldBorder("email")}` }}
          />
        </div>

        {/* Submit button — green-teal once sent */}
        <button
          type="submit"
          disabled={sent || submitting}
          style={{
            width:         "100%",
            padding:       "16px 24px",
            background:    sent ? "rgba(95,180,162,0.15)" : "var(--gold)",
            border:        `1px solid ${sent ? "#5fb4a2" : "var(--gold)"}`,
            color:         sent ? "#5fb4a2" : "#0a0a0c",
            fontFamily:    "var(--sans)",
            fontSize:      12,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            fontWeight:    700,
            borderRadius:  2,
            cursor:        sent || submitting ? "default" : "pointer",
            transition:    "all 220ms",
          }}
        >
          {sent ? `✓ ${t("checkInbox")}` : `${t("submit")} →`}
        </button>

        {/* Privacy / rate-limit notice with gold left border */}
        <div style={{
          marginTop:   18,
          padding:     "12px 14px",
          background:  "rgba(0,0,0,0.3)",
          borderLeft:  "2px solid var(--gold)",
          fontFamily:  "var(--mono)",
          fontSize:    10,
          color:       "var(--muted)",
          letterSpacing: "0.05em",
          lineHeight:  1.5,
        }}>
          {t("voteNote")}
        </div>
      </form>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

/**
 * WhatsNextPage — community roadmap / voting page.
 * Fetches topics from the API on mount; supports adding via form and voting.
 */
export default function WhatsNextPage() {
  const t      = useTranslations("whatsNext");
  const locale = useLocale();

  /* Full list of topics from the API, mutable by optimistic adds/votes */
  const [topics,     setTopics]     = useState<Topic[]>([]);
  const [loading,    setLoading]    = useState(true);
  /** Set of topic IDs the current user has voted on (optimistic, in-memory) */
  const [localVoted, setLocalVoted] = useState<Set<number>>(new Set());

  /* Fetch topics on mount (GET /topics) */
  useEffect(() => {
    fetch(`${API_BASE}/topics`)
      .then((r) => r.json())
      .then((data: Topic[]) => setTopics(data))
      .catch(() => { /* fail silently; show empty list */ })
      .finally(() => setLoading(false));
  }, []);

  /** Sort topics by effective vote count descending (including optimistic +1). */
  const sorted = [...topics].sort(
    (a, b) =>
      (b.vote_count + (localVoted.has(b.id) ? 1 : 0)) -
      (a.vote_count + (localVoted.has(a.id) ? 1 : 0))
  );

  /**
   * Handle vote click for a topic.
   * Marks topic as voted optimistically, then fires the API call.
   * @param topicId - ID of the topic to vote for
   */
  const handleVote = async (topicId: number) => {
    if (localVoted.has(topicId)) return; /* already voted — no-op */

    /* Optimistic update: mark as voted immediately */
    setLocalVoted((prev) => new Set(prev).add(topicId));

    try {
      /* email auth deferred — use anonymous placeholder */
      await fetch(`${API_BASE}/votes`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          topic_id: topicId,
          email:    "anonymous@husariabeats.com",
        }),
      });
    } catch {
      /* On failure leave optimistic state; server will reconcile on next load */
    }
  };

  /**
   * Prepend a newly-created topic to the list after form submission.
   * @param topic - Topic object returned by POST /topics
   */
  const handleNewTopic = (topic: Topic) => {
    setTopics((prev) => [topic, ...prev]);
  };

  /* Total vote count for ranking header subtitle */
  const totalVotes = sorted.reduce((sum, t) => sum + t.vote_count, 0);

  return (
    <div style={{ padding: "140px 36px 120px", maxWidth: 1440, margin: "0 auto" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 64 }}>
        {/* COMMUNITY · ROADMAP badge */}
        <div style={{
          fontFamily:    "var(--mono)",
          fontSize:      11,
          letterSpacing: "0.4em",
          color:         "var(--gold)",
          marginBottom:  20,
        }}>
          {t("badge")}
        </div>

        {/* Page H1 */}
        <h1 style={{
          fontFamily:    "var(--serif)",
          fontSize:      "clamp(64px,9vw,128px)",
          fontWeight:    600,
          color:         "var(--cream)",
          lineHeight:    0.95,
          letterSpacing: "-0.02em",
          marginBottom:  20,
        }}>
          {t("title")}
        </h1>

        {/* Italic subtitle */}
        <p style={{
          fontFamily: "var(--serif)",
          fontStyle:  "italic",
          fontSize:   "clamp(18px,1.6vw,24px)",
          color:      "var(--cream-dim)",
          maxWidth:   680,
          lineHeight: 1.4,
        }}>
          {t("subtitle")}
        </p>
      </div>

      {/* ── Two-column grid: form (left) + topic list (right) ── */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "420px 1fr",
        gap:                 48,
        alignItems:          "start",
      }}>

        {/* Left: sticky submission form */}
        <SubmissionForm onSubmit={handleNewTopic} t={t} />

        {/* Right: sorted topic list */}
        <div>
          {/* Ranking header */}
          <div style={{
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "baseline",
            marginBottom:   24,
            paddingBottom:  16,
            borderBottom:   "1px solid rgba(200,168,75,0.15)",
          }}>
            <div style={{
              fontFamily:    "var(--mono)",
              fontSize:      11,
              letterSpacing: "0.3em",
              color:         "var(--gold)",
              textTransform: "uppercase",
            }}>
              ◆ {t("rankingTitle")}
            </div>
            <div style={{
              fontFamily:    "var(--mono)",
              fontSize:      10,
              color:         "var(--muted-2)",
              letterSpacing: "0.18em",
            }}>
              {loading ? "…" : `${sorted.length} ${t("topics")} · ${totalVotes.toLocaleString()} ${t("votes")}`}
            </div>
          </div>

          {/* Topic cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {loading ? (
              /* Minimal loading state */
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted-2)" }}>…</div>
            ) : (
              sorted.map((topic, i) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  rank={i + 1}
                  voted={localVoted.has(topic.id)}
                  onVote={() => handleVote(topic.id)}
                  t={t}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
