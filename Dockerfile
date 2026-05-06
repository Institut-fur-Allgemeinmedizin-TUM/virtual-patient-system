
# Stage 1: Build mobile web frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/mobile

# Copy mobile package files
COPY mobile/package*.json ./
RUN npm ci

# Copy mobile source
COPY mobile/ ./

# Build web frontend (use default BACKEND_URL or set from host)
RUN npx expo export --platform web

# Stage 2: Production image
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY start.sh ./

# Make startup script executable
RUN chmod +x start.sh


# Copy mobile web build from previous stage
COPY --from=frontend-builder /app/mobile/dist ./mobile/dist

# Expose port (Cloud Run will set PORT env var)
EXPOSE 8080

# Run migrations and start the application
CMD ["./start.sh"]

