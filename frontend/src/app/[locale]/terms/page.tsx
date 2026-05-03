/*
 * app/[locale]/terms/page.tsx — Terms of Service page
 *
 * Minimal legal page required for:
 *   - TikTok Content Posting API app review
 *   - Meta (Facebook/Instagram) app review
 *
 * Inherits dark layout from [locale]/layout.tsx (NavBar, Footer, grain overlay).
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — husariabeats",
  description: "Terms of service for husariabeats.com",
};

export default function TermsPage() {
  return (
    <div style={{
      maxWidth: "760px",
      margin: "0 auto",
      padding: "120px 24px 80px",
      fontFamily: "var(--sans)",
      lineHeight: 1.8,
      color: "var(--cream-dim)",
    }}>
      <h1 style={{
        fontFamily: "var(--serif)",
        fontSize: "clamp(2rem, 5vw, 3rem)",
        fontWeight: 600,
        color: "var(--cream)",
        marginBottom: "8px",
      }}>
        Terms of Service
      </h1>
      <p style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "0.8rem", marginBottom: "48px" }}>
        Last updated: April 28, 2026
      </p>

      <Section title="1. Acceptance">
        <p>
          By accessing or using <strong>husariabeats.com</strong>, you agree to be bound by these
          Terms of Service. If you do not agree, please do not use the site.
        </p>
      </Section>

      <Section title="2. Use of the site">
        <p>You may use this site for personal, non-commercial, educational purposes. You may not:</p>
        <ul style={{ paddingLeft: "24px", marginTop: "8px" }}>
          <li>Scrape, reproduce, or redistribute our content without prior written permission</li>
          <li>Use automated tools to interact with the voting system</li>
          <li>Submit false, misleading, or harmful content through any forms</li>
          <li>Attempt to circumvent rate limits or access controls</li>
        </ul>
      </Section>

      <Section title="3. Intellectual property">
        <p>
          All original music, lyrics, visual assets, and written content on this site are owned
          by HusariaBeats and protected by copyright. Historical facts are not copyrightable,
          but our specific presentation and commentary are.
        </p>
        <p style={{ marginTop: "12px" }}>
          YouTube video embeds remain subject to YouTube's Terms of Service. Music distributed
          via streaming platforms is subject to the respective platform's terms.
        </p>
      </Section>

      <Section title="4. Community voting">
        <p>
          The "What's Next" voting feature collects community input on future content ideas.
          Votes are non-binding — HusariaBeats retains full creative control over all production
          and release decisions. Submitting a topic idea does not create any entitlement to
          compensation or credit.
        </p>
        <p style={{ marginTop: "12px" }}>
          One vote per email address per topic per 24-hour period is permitted. Attempts to
          manipulate vote counts may result in removal of submissions.
        </p>
      </Section>

      <Section title="5. Third-party platforms">
        <p>
          Our automated publishing system posts content to TikTok, Facebook, and Instagram using
          official APIs. Your interaction with content on those platforms is governed by their
          respective terms of service, not ours.
        </p>
      </Section>

      <Section title="6. Disclaimer">
        <p>
          This site is provided on an "as-is" basis without warranties of any kind. HusariaBeats
          is not liable for any direct or indirect damages arising from your use of the site,
          inability to access the site, or reliance on information contained herein.
        </p>
        <p style={{ marginTop: "12px" }}>
          Historical content is presented for educational purposes. We strive for accuracy but
          make no warranties regarding the completeness or correctness of historical information.
        </p>
      </Section>

      <Section title="7. Changes">
        <p>
          We may update these terms at any time. The "Last updated" date at the top of this page
          reflects the most recent revision. Continued use of the site after changes constitutes
          acceptance of the updated terms.
        </p>
      </Section>

      <Section title="8. Governing law">
        <p>
          These terms are governed by the laws of Poland. Any disputes shall be subject to the
          jurisdiction of Polish courts.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          Questions about these terms:{" "}
          <a href="mailto:husariabeats@gmail.com" style={{ color: "var(--gold)" }}>
            husariabeats@gmail.com
          </a>
        </p>
      </Section>
    </div>
  );
}

/* ── Helper: section block ───────────────────────────────────────────────────
 * Input:  title (string), children (ReactNode)
 * Output: styled section with heading and body
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "40px" }}>
      <h2 style={{
        fontFamily: "var(--serif)",
        fontSize: "1.35rem",
        fontWeight: 600,
        color: "var(--cream)",
        borderBottom: "1px solid var(--line)",
        paddingBottom: "8px",
        marginBottom: "16px",
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}
