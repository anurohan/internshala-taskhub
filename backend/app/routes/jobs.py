"""
TaskHub — Jobs Status Route
"""
from flask import Blueprint, jsonify
from ..utils.auth_middleware import require_auth
from ..workers.queue import get_queue
from rq.job import Job, NoSuchJobError
import redis
from ..config import settings

jobs_bp = Blueprint("jobs", __name__)


@jobs_bp.get("/jobs/<job_id>/status")
@require_auth
def job_status(job_id: str):
    """Poll status of an RQ background job."""
    try:
        r = redis.from_url(settings.REDIS_URL)
        job = Job.fetch(job_id, connection=r)

        result = None
        error = None

        if job.is_finished:
            result = job.result
        elif job.is_failed:
            error = str(job.exc_info) if job.exc_info else "Job failed"

        return jsonify({
            "job_id": job_id,
            "status": job.get_status().value,
            "result": result,
            "error": error,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "ended_at": job.ended_at.isoformat() if job.ended_at else None,
        }), 200

    except NoSuchJobError:
        return jsonify({"error": "Job not found", "job_id": job_id}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch job status", "detail": str(e)}), 500
