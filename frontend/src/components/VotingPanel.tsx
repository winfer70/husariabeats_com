// components/VotingPanel.tsx — Community voting UI
// Fetches topics from /api/topics, renders vote counts,
// allows user to vote by submitting email.
// One vote per email per topic per 24h (enforced server-side).
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface Topic {
  id:          number;
  title:       string;
  description: string | null;
  status:      string;
  vote_count:  number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/**
 * Voting panel: lists topics with vote counts.
 * Submit email to cast vote; shows error if already voted.
 */
export default function VotingPanel() {
  const t = useTranslations("voting");

  const [topics,  setTopics]  = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [email,   setEmail]   = useState("");
  const [voting,  setVoting]  = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch topics on mount
  useEffect(() => {
    fetch(`${API_BASE}/topics`)
      .then((r) => r.json())
      .then((data) => { setTopics(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  /**
   * Cast vote for a topic.
   * @param topicId - ID of the topic to vote for
   */
  async function handleVote(topicId: number) {
    if (!email) return;
    setVoting(topicId);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/votes`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ topic_id: topicId, email }),
      });

      if (res.status === 429) {
        setMessage(t("voted"));
      } else if (res.ok) {
        const data: { vote_count: number } = await res.json();
        setTopics((prev) =>
          prev.map((topic) =>
            topic.id === topicId ? { ...topic, vote_count: data.vote_count } : topic
          )
        );
      }
    } finally {
      setVoting(null);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <input
        type="email"
        placeholder={t("email_label")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {message && <p>{message}</p>}
      <ul>
        {topics.map((topic) => (
          <li key={topic.id}>
            <span>{topic.title}</span>
            <span>{topic.vote_count} {t("votes")}</span>
            <button
              onClick={() => handleVote(topic.id)}
              disabled={voting === topic.id || !email}
            >
              {t("vote")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
