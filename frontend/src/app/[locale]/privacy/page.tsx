/*
 * app/[locale]/privacy/page.tsx — Privacy Policy page
 *
 * Minimal legal page required for:
 *   - TikTok Content Posting API app review
 *   - Meta (Facebook/Instagram) app review
 *   - GDPR compliance (EU visitors)
 *
 * Inherits dark layout from [locale]/layout.tsx (NavBar, Footer, grain overlay).
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — husariabeats",
  description: "Privacy policy for husariabeats.com",
};

export default function PrivacyPage() {
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
        Privacy Policy
      </h1>
      <p style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "0.8rem", marginBottom: "48px" }}>
        Last updated: April 28, 2026
      </p>

      <Section title="1. Who we are">
        <p>
          HusariaBeats (<strong>husariabeats.com</strong>) is an educational music website dedicated
          to Polish military history told through original music. The website is operated by an
          individual creator and can be contacted at{" "}
          <a href="mailto:husariabeats@gmail.com" style={{ color: "var(--gold)" }}>
            husariabeats@gmail.com
          </a>.
        </p>
      </Section>

      <Section title="2. Data we collect">
        <p><strong style={{ color: "var(--cream)" }}>Community voting:</strong></p>
        <p>
          When you vote on a community topic, we ask for your email address solely to prevent
          duplicate votes. Your email is immediately hashed using SHA-256 and the original address
          is discarded. We never store raw email addresses.
        </p>
        <br />
        <p><strong style={{ color: "var(--cream)" }}>Server logs:</strong></p>
        <p>
          Standard web server logs (IP address, browser type, pages visited, timestamp) are retained
          for up to 30 days for security and debugging purposes only.
        </p>
        <br />
        <p><strong style={{ color: "var(--cream)" }}>No tracking:</strong></p>
        <p>
          We do not use analytics services (Google Analytics, etc.), advertising networks, or
          any third-party tracking scripts.
        </p>
      </Section>

      <Section title="3. TikTok integration">
        <p>
          We use the TikTok Content Posting API to publish our music videos to our official
          HusariaBeats TikTok account. This integration:
        </p>
        <ul style={{ paddingLeft: "24px", marginTop: "8px" }}>
          <li>Only uses our own TikTok account credentials for posting</li>
          <li>Does not collect, store, or process data from any TikTok users</li>
          <li>Does not access TikTok user profiles, followers, or messages</li>
          <li>Is used solely for automated publishing of our own content</li>
        </ul>
      </Section>

      <Section title="4. Facebook and Instagram integration">
        <p>
          We use the Meta Graph API to post our music videos to our official HusariaBeats
          Facebook Page and Instagram Business account. This integration:
        </p>
        <ul style={{ paddingLeft: "24px", marginTop: "8px" }}>
          <li>Only uses our own account credentials and page tokens</li>
          <li>Does not collect or store data from any Facebook or Instagram users</li>
          <li>Is used solely for automated publishing of our own content</li>
        </ul>
      </Section>

      <Section title="5. YouTube embeds">
        <p>
          Our website embeds YouTube videos using standard YouTube iframe embeds.
          YouTube may set cookies and collect data as described in{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--gold)" }}
          >
            Google's Privacy Policy
          </a>. We use{" "}
          <code style={{ fontFamily: "var(--mono)", fontSize: "0.85em" }}>youtube-nocookie.com</code>{" "}
          where possible to limit tracking.
        </p>
      </Section>

      <Section title="6. Cookies">
        <p>
          We do not use advertising or tracking cookies. A session cookie may be set to remember
          your language preference (Polish or English). This cookie contains no personal information
          and expires when you close your browser.
        </p>
      </Section>

      <Section title="7. Your rights (GDPR)">
        <p>If you are located in the European Union, you have the right to:</p>
        <ul style={{ paddingLeft: "24px", marginTop: "8px" }}>
          <li>Request access to any personal data we hold about you</li>
          <li>Request deletion of your data</li>
          <li>Object to processing of your data</li>
        </ul>
        <p style={{ marginTop: "12px" }}>
          Because we only store hashed email addresses (not reversible), we cannot identify you
          from a hash alone. To exercise your rights, contact us and we will delete all hashes
          associated with your email.
        </p>
      </Section>

      <Section title="8. Data retention">
        <p>
          Vote records (hashed email + topic) are retained indefinitely to prevent duplicate votes.
          Server logs are retained for 30 days. We hold no other personal data.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          For any privacy-related questions or requests:{" "}
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
