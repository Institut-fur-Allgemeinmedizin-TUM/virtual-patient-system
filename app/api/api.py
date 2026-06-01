import os
import re
from contextlib import asynccontextmanager

from fastapi import (
    FastAPI,
)
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import RedirectResponse

from app.api import auth, session, util, health, user, medical_background
from app.config.config import settings
from app.db.db import SessionLocal
from app.db.init_db import init_roles, init_anon_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize roles in the database
    db = SessionLocal()
    try:
        init_roles(db)
        if not settings.require_auth:
            init_anon_user(db)
    finally:
        db.close()
    yield


# Trigger redeployment with OIDC_AUTH_URL secret now configured
app = FastAPI(
    title="Virtual Patient Backend",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
)
app.include_router(auth.authRouter)
app.include_router(session.sessionRouter)
app.include_router(util.utilRouter)
app.include_router(health.healthRouter)
app.include_router(user.userRouter)
app.include_router(medical_background.medical_background_router)

# Check whether docs/build exists
if os.path.isdir("docs/build"):
    # Serve docs from /docs
    print("Found docs, serving docs")
    from fastapi.staticfiles import StaticFiles

    @app.get("/docs", include_in_schema=False)
    async def redirect_docs():
        return RedirectResponse(url="/docs/")

    app.mount("/docs", StaticFiles(directory="docs/build", html=True), name="docs")
else:
    print("Docs not built, not serving")

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
