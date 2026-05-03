# routers/notifications.py — Internal notification helpers for topic status changes.
#
# Not a router — no FastAPI routes exposed.
# Called from topics.py PATCH when status changes to in_development or released.
#
# notify_topic_subscribers(db, topic_id, topic_title, new_status, yt_pl, yt_en)
#   — sends email to all active vote_subscriptions for the topic
#   — active = email_expires_at > NOW()
#   — fire-and-forget: email errors logged, never propagated

import asyncio
import os

import databases
import resend

from email_templates import in_development_email, released_email

EMAIL_FROM      = os.environ.get("EMAIL_FROM", "onboarding@resend.dev")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "HusariaBeats")

resend.api_key = os.environ.get("RESEND_API_KEY", "")


async def notify_topic_subscribers(
    db:          databases.Database,
    topic_id:    int,
    topic_title: str,
    new_status:  str,
    yt_pl:       str | None = None,
    yt_en:       str | None = None,
) -> None:
    """
    Send email notifications to all confirmed subscribers for a topic.
    Only fires for status transitions: in_development, released.
    Ignores errors — never raises.

    Args:
        db:          shared database connection
        topic_id:    topic being updated
        topic_title: human-readable title for email subject/body
        new_status:  'in_development' or 'released'
        yt_pl:       YouTube URL for PL version (released only)
        yt_en:       YouTube URL for EN version (released only)
    """
    # Only notify for these two status transitions
    if new_status not in ("in_development", "released"):
        return

    try:
        # Fetch all active subscribers — active means email_expires_at has not lapsed
        rows = await db.fetch_all(
            """
            SELECT email_raw FROM vote_subscriptions
            WHERE  topic_id = :topic_id
            AND    email_expires_at > NOW()
            """,
            {"topic_id": topic_id},
        )
        if not rows:
            return

        # Select the correct email template based on the new status
        if new_status == "in_development":
            # Returns {"subject": ..., "html": ...}
            tpl = in_development_email(topic_title)
        else:
            # released_email also receives YouTube links for PL and EN versions
            tpl = released_email(topic_title, yt_pl, yt_en)

        # Send to each subscriber sequentially to respect Resend rate limits
        for row in rows:
            try:
                # Resend SDK is synchronous — offload to thread pool
                await asyncio.to_thread(
                    resend.Emails.send,
                    {
                        "from": f"{EMAIL_FROM_NAME} <{EMAIL_FROM}>",
                        "to": [row["email_raw"]],
                        "subject": tpl["subject"],
                        "html": tpl["html"],
                    }
                )
            except Exception as exc:
                # Per-recipient failure is logged but does not abort remaining sends
                print(f"[notifications] failed to email {row['email_raw']}: {exc}")

    except Exception as exc:
        print(f"[notifications] notify_topic_subscribers error: {exc}")
