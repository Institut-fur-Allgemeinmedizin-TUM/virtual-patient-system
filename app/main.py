import os

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi import (
    HTTPException,
    Response
)

from app.api.api import app, _read_mobile_index_html
from app.config.config import settings



# Mount static files and serve the mobile web frontend (production only)
if settings.environment == "production" or settings.environment == "beta":
    frontend_dist = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "mobile", "dist"
    )

    if os.path.exists(frontend_dist):
        # Serve Expo runtime assets and route manifest
        app.mount(
            "/_expo",
            StaticFiles(directory=os.path.join(frontend_dist, "_expo")),
            name="expo",
        )

        # Serve static assets (JS, CSS, images)
        app.mount(
            "/assets",
            StaticFiles(directory=os.path.join(frontend_dist, "assets")),
            name="assets",
        )

        # Serve other static files (favicon, images, etc.)
        static_files = [
            "favicon.ico",
            "file.svg",
            "globe.svg",
            "next.svg",
            "vercel.svg",
            "window.svg",
        ]
        for file in static_files:
            file_path = os.path.join(frontend_dist, file)
            if os.path.exists(file_path):

                @app.get(f"/{file}")
                async def serve_static_file(file_name=file):
                    return FileResponse(os.path.join(frontend_dist, file_name))

        # Serve patient images
        patients_dir = os.path.join(frontend_dist, "patients")
        if os.path.exists(patients_dir):
            app.mount("/patients", StaticFiles(directory=patients_dir), name="patients")

        # Serve index.html for all other routes (SPA support)
        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            # Don't interfere with API routes
            if (
                full_path.startswith("api/")
                or full_path.startswith("auth/")
                or full_path == "health"
            ):
                raise HTTPException(status_code=404, detail="Not found")

            return Response(
                content=_read_mobile_index_html(frontend_dist),
                media_type="text/html",
                headers={"Cache-Control": "no-store"},
            )
