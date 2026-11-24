# Backend Dockerfile - Multi-stage build
FROM python:3.13-slim AS base

# Install dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

FROM python:3.13-slim AS runtime

# Copy installed packages from base
COPY --from=base /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=base /usr/local/bin /usr/local/bin

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create data directory with proper permissions and grant broad access for volume mounts
RUN mkdir -p /data && chown -R appuser:appuser /data && chmod 777 /data

# Copy application
WORKDIR /app
COPY app/ ./app/

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Start server: ensure /data directory permissions on runtime mount, then run uvicorn
CMD ["sh", "-c", "mkdir -p /data 2>/dev/null; chmod 777 /data 2>/dev/null; uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
