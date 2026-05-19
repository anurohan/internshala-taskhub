"""
TaskHub Flask Application Factory
"""
from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from .config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=settings.REDIS_URL,
)


def create_app() -> Flask:
    app = Flask(__name__, template_folder="../templates")
    app.secret_key = settings.FLASK_SECRET_KEY

    # CORS — allow Next.js frontend
    CORS(
        app,
        resources={r"/api/*": {"origins": settings.ALLOWED_ORIGINS}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    # Rate limiting
    limiter.init_app(app)

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.tasks import tasks_bp
    from .routes.jobs import jobs_bp
    from .routes.generations import generations_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(tasks_bp, url_prefix="/api")
    app.register_blueprint(jobs_bp, url_prefix="/api")
    app.register_blueprint(generations_bp, url_prefix="/api")

    # Health check
    @app.get("/health")
    def health():
        return {"status": "ok", "version": "1.0.0"}

    return app
