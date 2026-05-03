# email_templates.py — Bilingual HTML email templates for voting notifications.
#
# Role in project: Provides pre-built HTML email payloads for transactional
# emails sent via the Resend API (magic link confirmation, status change alerts).
#
# Templates:
#   magic_link_email(topic_title, magic_url)               — vote subscription confirmation
#   in_development_email(topic_title)                      — topic entered production
#   released_email(topic_title, yt_pl, yt_en)              — song published on YouTube
#
# All templates are bilingual PL/EN in a single email.
# Styling: dark background (#0a0a0c), gold accents (#c8a84b), minimal Georgia/monospace.
#
# Each function returns a dict: {"subject": str, "html": str}
# ready to be passed directly to resend.Emails.send().


def _base_html(body_content: str) -> str:
    """
    Wrap body_content in the shared HusariaBeats dark-theme email shell.

    Args:
        body_content (str): Inner HTML for the body <td> section.

    Returns:
        str: Complete HTML document string.
    """
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0c;color:#e8ddd5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#12100e;border:1px solid rgba(200,168,75,0.2);border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:32px 40px 24px;border-bottom:1px solid rgba(200,168,75,0.15);">
          <p style="margin:0;font-size:10px;letter-spacing:0.4em;color:#c8a84b;text-transform:uppercase;font-family:monospace;">HUSARIABEATS</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 40px;">
          {body_content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(200,168,75,0.1);">
          <p style="margin:0;font-size:11px;color:#6b6560;font-family:monospace;">
            husariabeats.com · Twoje dane e-mail zostaną usunięte po 90 dniach / Your email will be auto-deleted after 90 days.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _button(url: str, label: str) -> str:
    """
    Render a gold CTA button anchor tag.

    Args:
        url   (str): Href for the button link.
        label (str): Visible button text.

    Returns:
        str: HTML <a> string styled as a gold button.
    """
    return (
        f'<a href="{url}" style="display:inline-block;padding:12px 24px;'
        f"background:#c8a84b;color:#0a0a0c;text-decoration:none;border-radius:4px;"
        f'font-family:monospace;font-size:12px;letter-spacing:0.1em;font-weight:700;">'
        f"{label}</a>"
    )


def magic_link_email(topic_title: str, magic_url: str) -> dict:
    """
    Build the vote-subscription confirmation email with a magic link.

    Sent immediately after a user submits their email on the voting page.
    The magic link expires in 15 minutes; clicking it confirms the subscription
    and stores the address for future status-change notifications.

    Args:
        topic_title (str): Display name of the voted-for beat/topic.
        magic_url   (str): One-time confirmation URL (MAGIC_LINK_BASE_URL + token).

    Returns:
        dict: {"subject": str, "html": str}
    """
    subject = f"Potwierdź głos / Confirm vote — {topic_title}"

    body = f"""
      <!-- PL -->
      <p style="margin:0 0 8px;font-size:15px;line-height:1.6;">
        Dziękujemy za głos na <strong>{topic_title}</strong>!
        Kliknij poniższy przycisk, aby potwierdzić subskrypcję i otrzymywać powiadomienia,
        gdy utwór wejdzie do produkcji lub zostanie opublikowany.
        <span style="color:#c8a84b;">Link wygasa za 15 minut.</span>
      </p>

      <hr style="border:none;border-top:1px solid rgba(200,168,75,0.15);margin:24px 0;">

      <!-- EN -->
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
        Thanks for voting for <strong>{topic_title}</strong>!
        Click the button below to confirm your subscription and receive updates
        when this track enters production or gets published.
        <span style="color:#c8a84b;">Link expires in 15 minutes.</span>
      </p>

      <!-- CTA -->
      <p style="margin:0 0 24px;">
        {_button(magic_url, "Potwierdź / Confirm")}
      </p>

      <!-- Ignore note -->
      <p style="margin:0;font-size:12px;color:#6b6560;font-family:monospace;">
        Jeśli nie głosowałeś/aś, zignoruj tę wiadomość. /
        If you didn't vote, ignore this email.
      </p>
    """

    return {"subject": subject, "html": _base_html(body)}


def in_development_email(topic_title: str) -> dict:
    """
    Notify a subscriber that their voted-for topic has entered production.

    Triggered when an admin moves a topic's status to `in_development`.
    Sent to all confirmed subscribers of that topic whose email_raw is
    still within the 90-day retention window.

    Args:
        topic_title (str): Display name of the beat/topic now in production.

    Returns:
        dict: {"subject": str, "html": str}
    """
    subject = f"W produkcji! / In production! — {topic_title}"

    body = f"""
      <!-- PL -->
      <p style="margin:0 0 8px;font-size:15px;line-height:1.6;">
        Dobra wiadomość! Twój głos się opłacił —
        <strong>{topic_title}</strong> właśnie wchodzi do produkcji!
        Poinformujemy Cię, gdy utwór zostanie opublikowany.
      </p>

      <hr style="border:none;border-top:1px solid rgba(200,168,75,0.15);margin:24px 0;">

      <!-- EN -->
      <p style="margin:0;font-size:15px;line-height:1.6;">
        Great news! Your vote paid off —
        <strong>{topic_title}</strong> is now entering production!
        We'll let you know when it's published.
      </p>
    """

    return {"subject": subject, "html": _base_html(body)}


def released_email(
    topic_title: str,
    youtube_url_pl: str | None = None,
    youtube_url_en: str | None = None,
) -> dict:
    """
    Notify a subscriber that their voted-for track is now live on YouTube.

    Triggered when an admin moves a topic's status to `released` and sets
    at least one YouTube URL. Buttons for PL/EN versions are rendered only
    when the respective URL is provided.

    Args:
        topic_title     (str):       Display name of the published beat/track.
        youtube_url_pl  (str|None):  YouTube URL for the Polish-language version, or None.
        youtube_url_en  (str|None):  YouTube URL for the English-language version, or None.

    Returns:
        dict: {"subject": str, "html": str}
    """
    subject = f"Już dostępne! / Now available! — {topic_title}"

    # Build optional YouTube buttons
    buttons_html = ""
    if youtube_url_pl:
        buttons_html += (
            f'<p style="margin:0 0 12px;">'
            f"{_button(youtube_url_pl, 'Oglądaj po polsku →')}"
            f"</p>"
        )
    if youtube_url_en:
        buttons_html += (
            f'<p style="margin:0 0 12px;">'
            f"{_button(youtube_url_en, 'Watch in English →')}"
            f"</p>"
        )

    body = f"""
      <!-- PL -->
      <p style="margin:0 0 8px;font-size:15px;line-height:1.6;">
        Utwór <strong>{topic_title}</strong>, na który głosowałeś/aś,
        jest już dostępny na YouTube!
      </p>

      <hr style="border:none;border-top:1px solid rgba(200,168,75,0.15);margin:24px 0;">

      <!-- EN -->
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
        The track <strong>{topic_title}</strong> you voted for
        is now available on YouTube!
      </p>

      <!-- YouTube buttons (rendered only when URLs provided) -->
      {buttons_html}
    """

    return {"subject": subject, "html": _base_html(body)}
