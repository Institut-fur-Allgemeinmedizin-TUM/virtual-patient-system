import logging
import logging
import os
import re
from typing import Dict

from fastapi import (
    FastAPI,
)
from fastapi.middleware.cors import CORSMiddleware

from app.config.config import settings

# Trigger redeployment with OIDC_AUTH_URL secret now configured
app = FastAPI(title="Virtual Patient Backend", version="0.1.0")

# Add CORS middleware
# In production, the frontend is served from the same origin
# In development, allow localhost and local-network origins so mobile devices can reach the backend
cors_origins = [
    "http://localhost:3000",
    "http://localhost:8082",
    "http://localhost:8081",
]
cors_origin_regex = r"^http://((localhost|127\.0\.0\.1)|((10|192\.168)\.\d+\.\d+)|(172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+))(:\d+)?$"
if settings.environment == "production":
    # Allow same-origin requests in production
    cors_origins = ["*"]  # Or specify your Cloud Run URL
    cors_origin_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for VHB sessions (not persisted to database)
# Structure: {session_id: {"case_id": str, "messages": [{"role": str, "content": str}]}}
vhb_sessions: Dict[str, Dict] = {}



logger = logging.getLogger("uvicorn.info")


def _read_mobile_index_html(frontend_dist: str) -> str:
    index_path = os.path.join(frontend_dist, "index.html")
    with open(index_path, encoding="utf-8") as index_file:
        html = index_file.read()

    # Add a query string so browsers don't reuse a stale cached bundle URL.
    html = re.sub(
        r'src="(/_expo/static/js/web/[^"]+)"',
        r'src="\1?v=mobile-web-1"',
        html,
    )
    return html