/*
 * admin/src/app/flow/page.tsx — Production Flow Guide
 *
 * Visual reference for the full song lifecycle from idea to live release.
 * Shows every stage, required files, n8n automation steps, and output platforms.
 * Static — no API calls needed; pure documentation page.
 */

"use client";

const GOLD   = "#c8a84b";
const RED    = "#dc143c";
const MUTED  = "#a89a92";
const CREAM  = "#f5f5f0";
const BG1    = "#161013";
const BG2    = "#1a1510";
const BORDER = "#2e2125";

// ── Stage definitions ─────────────────────────────────────────────────────────

interface SubItem {
  text: string;
  dim?: boolean;
}

interface Stage {
  num:      number;
  emoji:    string;
  title:    string;
  status?:  string;   // DB status value, if applicable
  color:    string;
  items:    SubItem[];
  tool?:    string;   // admin page to use
}

const STAGES: Stage[] = [
  {
    num: 1, emoji: "💡", title: "IDEA", color: "#6aadee",
    items: [
      { text: "Open topic in /voting (title PL + EN, description)" },
      { text: "Community votes via magic-link email" },
      { text: "Pick top-voted topic for next production cycle" },
    ],
    tool: "/voting",
  },
  {
    num: 2, emoji: "🔬", title: "RESEARCH & SCRIPT", color: "#a0c060",
    items: [
      { text: "Historical research — sources, dates, facts" },
      { text: "Write narration script PL + EN" },
      { text: "Record voice-over (PL narrator + EN narrator)" },
      { text: "Create new song in DB: /songs → New Song", dim: false },
    ],
    tool: "/songs/new",
  },
  {
    num: 3, emoji: "🎵", title: "AUDIO READY", status: "audio_ready", color: "#e0c040",
    items: [
      { text: "Music composition + audio mix complete" },
      { text: "PL + EN audio files synced and ready" },
      { text: "Mark song status → audio_ready in /pipeline" },
    ],
    tool: "/pipeline",
  },
  {
    num: 4, emoji: "🎬", title: "VIDEO SYNC", status: "sync_done", color: "#e08030",
    items: [
      { text: "Cut footage / images to audio timeline" },
      { text: "Subtitles, captions, transitions complete" },
      { text: "Mark song status → sync_done in /pipeline" },
    ],
    tool: "/pipeline",
  },
  {
    num: 5, emoji: "🖥", title: "RENDER DONE", status: "render_done", color: "#c060e0",
    items: [
      { text: "{slug}_pl.mp4 — 16:9 1920×1080, YouTube long-form PL" },
      { text: "{slug}_en.mp4 — 16:9 1920×1080, YouTube long-form EN" },
      { text: "{slug}-feed-pl.mp4 — 9:16 1080×1920, ≤3 min, Shorts/TikTok/IG/FB PL" },
      { text: "{slug}-feed-en.mp4 — 9:16 1080×1920, ≤3 min, Shorts/TikTok/IG/FB EN" },
      { text: "{slug}_thumb.jpg — 1280×720, YouTube thumbnail (real portrait + AI bg)" },
      { text: "meta.json — platform text, captions, descriptions, sources" },
      { text: "Mark song status → render_done in /pipeline" },
    ],
    tool: "/pipeline",
  },
  {
    num: 6, emoji: "📤", title: "UPLOAD TO SERVER", color: "#60c0a0",
    items: [
      { text: "Open /upload → select song → drag-drop all 6 files" },
      { text: "OR: SCP directly to /srv/husariabeats_com/releases/{slug}/" },
      { text: "Verify all 6 files show ✓ green in /upload checklist" },
      { text: "Confirm URLs live: husariabeats.com/releases/{slug}/{slug}_pl.mp4" },
    ],
    tool: "/upload",
  },
  {
    num: 7, emoji: "⏱", title: "QUEUE FOR RELEASE", status: "scheduled", color: "#8080e0",
    items: [
      { text: "Open /pipeline → song appears in RENDER DONE section" },
      { text: "Click → Queue → pick date (one song per day recommended)" },
      { text: "Song moves to scheduled status, appears in /queue" },
    ],
    tool: "/queue",
  },
  {
    num: 8, emoji: "🚀", title: "AUTOMATED RELEASE", color: RED,
    items: [
      { text: "n8n fires daily at 09:00 Warsaw (07:00 UTC)" },
      { text: "OR trigger manually: POST /webhook/husariabeats-release {queue_id}" },
      { text: "GET meta.json → PATCH song DB (summary, long_text, sources)" },
      { text: "POST YT PL Full → YouTube long-form PL, immediate" },
      { text: "POST Feed PL → YouTube Short + TikTok + Instagram + Facebook PL" },
      { text: "POST YT EN Full → YouTube long-form EN, immediate" },
      { text: "POST Feed EN → YouTube Short + TikTok + Instagram + Facebook EN" },
      { text: "Mark released in DB → POST Revalidate (flush Next.js ISR)" },
      { text: "Telegram ✅ notification with all video URLs" },
    ],
  },
  {
    num: 9, emoji: "🌍", title: "LIVE", color: "#40c060",
    items: [
      { text: "YouTube: long-form PL + long-form EN" },
      { text: "YouTube Shorts: feed PL + feed EN (auto-classified from 9:16 ≤3min)" },
      { text: "TikTok: feed PL + feed EN" },
      { text: "Instagram: feed PL + feed EN" },
      { text: "Facebook: feed PL + feed EN" },
      { text: "husariabeats.com/[pl|en]/songs/{slug} — song detail page (ISR flushed)" },
      { text: "husariabeats.com/[pl|en] — timeline updated" },
    ],
  },
];

// ── n8n workflow nodes ────────────────────────────────────────────────────────

const N8N_NODES = [
  { name: "Webhook / Schedule Daily", desc: "Trigger: POST webhook or 07:00 UTC cron" },
  { name: "Detect Mode", desc: "Webhook vs schedule path" },
  { name: "GET Queue", desc: "Fetch release_queue from API" },
  { name: "Pick Entry", desc: "Select entry by queue_id or today's date" },
  { name: "IF Has Entry", desc: "Gate: any song scheduled today?" },
  { name: "GET Settings", desc: "Check auto_release_enabled kill switch" },
  { name: "IF Kill Switch", desc: "Gate: kill switch on?" },
  { name: "Mark Releasing", desc: "PATCH queue status → releasing (prevent duplicates)" },
  { name: "GET Song", desc: "Fetch full song record from DB" },
  { name: "GET Meta", desc: "Fetch releases/{slug}/meta.json (continue_on_fail)" },
  { name: "PATCH Song Meta", desc: "Sync summary/long_text/sources → DB" },
  { name: "Build Upload", desc: "Assemble 4 upload payloads from meta + DB fallbacks" },
  { name: "POST YT PL Full", desc: "{slug}_pl.mp4 → YouTube only, with thumbnail" },
  { name: "POST Feed PL", desc: "{slug}-feed-pl.mp4 → YouTube+TikTok+IG+FB" },
  { name: "POST YT EN Full", desc: "{slug}_en.mp4 → YouTube only, with thumbnail" },
  { name: "POST Feed EN", desc: "{slug}-feed-en.mp4 → YouTube+TikTok+IG+FB" },
  { name: "IF Upload Success", desc: "Gate: Feed EN returned request_id?" },
  { name: "Mark Released", desc: "PATCH queue status → released + save request_id" },
  { name: "Update Song Released", desc: "PATCH song status → released" },
  { name: "POST Revalidate", desc: "Flush Next.js ISR for song + album + timeline pages" },
  { name: "Telegram Released", desc: "✅ Send success message with all video URLs" },
];

// ── File naming reference ─────────────────────────────────────────────────────

const FILE_ROWS = [
  { filename: "{slug}_pl.mp4",       spec: "16:9  1920×1080",  dest: "YouTube long-form PL"           },
  { filename: "{slug}_en.mp4",       spec: "16:9  1920×1080",  dest: "YouTube long-form EN"           },
  { filename: "{slug}-feed-pl.mp4",  spec: "9:16  1080×1920 ≤3min", dest: "Shorts + TikTok + IG + FB PL" },
  { filename: "{slug}-feed-en.mp4",  spec: "9:16  1080×1920 ≤3min", dest: "Shorts + TikTok + IG + FB EN" },
  { filename: "{slug}_thumb.jpg",    spec: "16:9  1280×720 min", dest: "YouTube thumbnail (long-form only)" },
  { filename: "meta.json",           spec: "JSON",              dest: "Platform text, captions, sources" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function FlowPage() {
  return (
    <div style={{ padding: "40px 48px 80px", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.3em", color: MUTED, marginBottom: 12, textTransform: "uppercase" }}>
          HusariaBeats
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 600, color: CREAM, marginBottom: 8 }}>
          Production Flow Guide
        </h1>
        <p style={{ color: MUTED, fontSize: 14 }}>
          Full song lifecycle — from idea to live on all platforms.
        </p>
      </div>

      {/* Stage timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {STAGES.map((stage, i) => (
          <div key={stage.num} style={{ display: "flex", gap: 0 }}>

            {/* Connector column */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 48, flexShrink: 0 }}>
              {/* Circle */}
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: BG1, border: `2px solid ${stage.color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0, zIndex: 1,
              }}>
                {stage.emoji}
              </div>
              {/* Vertical line */}
              {i < STAGES.length - 1 && (
                <div style={{ width: 2, flex: 1, background: BORDER, minHeight: 20 }} />
              )}
            </div>

            {/* Stage card */}
            <div style={{ flex: 1, marginLeft: 16, marginBottom: i < STAGES.length - 1 ? 24 : 0, paddingBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ fontFamily: "monospace", fontSize: 11, color: MUTED }}>
                  {String(stage.num).padStart(2, "0")}
                </div>
                <h2 style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: stage.color, letterSpacing: "0.15em", margin: 0 }}>
                  {stage.title}
                </h2>
                {stage.status && (
                  <span style={{ fontFamily: "monospace", fontSize: 10, padding: "2px 8px", borderRadius: 3, background: BG1, border: `1px solid ${stage.color}33`, color: stage.color }}>
                    status: {stage.status}
                  </span>
                )}
                {stage.tool && (
                  <a href={stage.tool} style={{ fontFamily: "monospace", fontSize: 10, color: MUTED, textDecoration: "none", marginLeft: "auto" }}>
                    → {stage.tool}
                  </a>
                )}
              </div>

              <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${stage.color}`, borderRadius: 4, padding: "12px 16px" }}>
                {stage.items.map((item, j) => (
                  <div key={j} style={{ display: "flex", gap: 10, marginBottom: j < stage.items.length - 1 ? 8 : 0 }}>
                    <span style={{ color: stage.color, fontSize: 12, flexShrink: 0, marginTop: 1 }}>▸</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: item.dim ? MUTED : CREAM, lineHeight: 1.5 }}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* File naming table */}
      <div style={{ marginTop: 56 }}>
        <h2 style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>
          Required Files Per Song
        </h2>
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: BG1 }}>
                {["Filename", "Spec", "Destination"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontFamily: "monospace", fontSize: 10, letterSpacing: "0.2em", color: MUTED, textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FILE_ROWS.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? BG2 : BG1 }}>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: GOLD }}>{row.filename}</td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: MUTED }}>{row.spec}</td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: CREAM }}>{row.dest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontFamily: "monospace", fontSize: 11, color: MUTED, marginTop: 8 }}>
          All files go in: <span style={{ color: GOLD }}>/releases/{"{"}{"{"}slug{"}"}{"}"}/</span> — served at husariabeats.com/releases/{"{"}slug{"}"}/
        </p>
      </div>

      {/* n8n workflow nodes */}
      <div style={{ marginTop: 56 }}>
        <h2 style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>
          n8n Release Workflow — Node Sequence
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {N8N_NODES.map((node, i) => (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "8px 16px", background: i % 2 === 0 ? BG2 : BG1, borderRadius: 3, border: `1px solid ${BORDER}` }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: MUTED, width: 20, flexShrink: 0, paddingTop: 2 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: GOLD, width: 220, flexShrink: 0 }}>
                {node.name}
              </span>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: MUTED }}>
                {node.desc}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: "10px 16px", background: BG1, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${RED}`, borderRadius: 4 }}>
          <p style={{ fontFamily: "monospace", fontSize: 11, color: MUTED, margin: 0 }}>
            Workflow ID: <span style={{ color: CREAM }}>1noccpiRfJsNY0Jg</span>
            {"  ·  "}
            Webhook: <span style={{ color: CREAM }}>POST /webhook/husariabeats-release</span>
            {"  ·  "}
            Schedule: <span style={{ color: CREAM }}>07:00 UTC daily (09:00 Warsaw)</span>
          </p>
        </div>
      </div>

      {/* meta.json structure */}
      <div style={{ marginTop: 56 }}>
        <h2 style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase", marginBottom: 16 }}>
          meta.json Key Fields
        </h2>
        <pre style={{ background: BG1, border: `1px solid ${BORDER}`, borderRadius: 4, padding: 20, fontFamily: "monospace", fontSize: 11, color: CREAM, overflow: "auto", lineHeight: 1.6 }}>
{`{
  "slug":         "song-slug",
  "title_pl":     "Tytuł PL",
  "title_en":     "Title EN",
  "summary_pl":   "≤80 chars — used as TikTok/IG caption fallback",
  "summary_en":   "≤80 chars — used as TikTok/IG caption fallback",
  "long_text_pl": "Full story PL (shown on song detail page)",
  "long_text_en": "Full story EN (shown on song detail page)",
  "sources":      ["Source 1", "Source 2"],
  "platforms": {
    "youtube": {
      "title_pl":                "Title [PL] | HusariaBeats",
      "title_en":                "Title [EN] | HusariaBeats",
      "description_pl":          "Full YT description PL",
      "description_en":          "Full YT description EN",
      "default_language_pl":     "pl",
      "default_language_en":     "en",
      "default_audio_language_pl": "pl-PL",
      "default_audio_language_en": "en-US"
    },
    "tiktok":    { "caption_pl": "≤150 chars + hashtags", "caption_en": "..." },
    "instagram": { "caption_pl": "≤2200 chars + hashtags", "caption_en": "..." },
    "facebook":  { "title_pl":   "...", "title_en": "...",
                   "description_pl": "...", "description_en": "..." }
  }
}`}
        </pre>
      </div>
    </div>
  );
}
