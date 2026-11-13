import os
from flask import Flask, jsonify
from backend.database import init_db
from backend.routes.analytics import analytics_bp
from backend.routes.auth import auth_bp
from backend.routes.handlers import handlers_bp
from backend.routes.reports import reports_bp
from backend.routes.routing import routing_bp
from backend.routes.validation import validation_bp


def create_app(test_engine=None, seed: bool = True) -> Flask:
    app = Flask(__name__)

    init_db(target_engine=test_engine, seed=seed)

    app.register_blueprint(auth_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(handlers_bp)
    app.register_blueprint(routing_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(validation_bp)

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "metropulse-flask-api"})

    @app.errorhandler(404)
    def not_found(_err):
        return jsonify({"error": "Endpoint not found."}), 404

    @app.errorhandler(500)
    def internal_error(_err):
        return jsonify({"error": "Internal server error."}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("FLASK_PORT", 5001))
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
