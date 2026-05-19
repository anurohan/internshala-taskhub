"""
TaskHub — Email Service (Resend + Jinja2 HTML templates)
"""
from __future__ import annotations
import logging
import resend
from flask import render_template
from ..config import settings

logger = logging.getLogger(__name__)

resend.api_key = settings.RESEND_API_KEY

FROM_ADDRESS = f"{settings.RESEND_FROM_NAME} <{settings.RESEND_FROM_EMAIL}>"


def _send(to_email: str, subject: str, html: str) -> bool:
    """Base send function."""
    try:
        result = resend.Emails.send({
            "from": FROM_ADDRESS,
            "to": [to_email],
            "subject": subject,
            "html": html,
        })
        logger.info(f"Email sent to {to_email}: {result.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_task_assigned_email(
    to_email: str,
    to_name: str,
    task_title: str,
    task_id: str,
) -> bool:
    task_url = f"{settings.FRONTEND_URL}/tasks/{task_id}"
    html = render_template(
        "emails/task_assigned.html",
        user_name=to_name,
        task_title=task_title,
        task_url=task_url,
        app_name="TaskHub",
    )
    return _send(to_email, f"New Task Assigned: {task_title}", html)


def send_task_submitted_email(
    to_email: str,
    to_name: str,
    task_title: str,
    task_id: str,
    submitted_by: str,
) -> bool:
    task_url = f"{settings.FRONTEND_URL}/admin/tasks/{task_id}"
    html = render_template(
        "emails/task_submitted.html",
        admin_name=to_name,
        task_title=task_title,
        task_url=task_url,
        submitted_by=submitted_by,
        app_name="TaskHub",
    )
    return _send(to_email, f"Task Submitted for Review: {task_title}", html)


def send_task_accepted_email(
    to_email: str,
    to_name: str,
    task_title: str,
    task_id: str,
) -> bool:
    task_url = f"{settings.FRONTEND_URL}/tasks/{task_id}"
    html = render_template(
        "emails/task_accepted.html",
        user_name=to_name,
        task_title=task_title,
        task_url=task_url,
        app_name="TaskHub",
    )
    return _send(to_email, f"🎉 Task Accepted: {task_title}", html)


def send_revision_requested_email(
    to_email: str,
    to_name: str,
    task_title: str,
    task_id: str,
    notes: str,
) -> bool:
    task_url = f"{settings.FRONTEND_URL}/tasks/{task_id}"
    html = render_template(
        "emails/revision_requested.html",
        user_name=to_name,
        task_title=task_title,
        task_url=task_url,
        admin_notes=notes,
        app_name="TaskHub",
    )
    return _send(to_email, f"Revision Requested: {task_title}", html)
