# Backend Dockerfile for Render
# Uses Debian slim image, installs postgresql-client and system deps, installs python deps and runs migrations

FROM python:3.11-slim

# avoid debconf tz prompt
ENV DEBIAN_FRONTEND=noninteractive

# system packages needed (including pg client)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        git \
        curl \
        ca-certificates \
        libpq-dev \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m appuser
WORKDIR /home/appuser/app

# Copy only requirements first (cache)
COPY requirements.txt /home/appuser/app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r /home/appuser/app/requirements.txt

# Copy project
COPY . /home/appuser/app
RUN chown -R appuser:appuser /home/appuser/app

USER appuser

ENV PATH="/home/appuser/.local/bin:$PATH"

# Expose port used by gunicorn
EXPOSE 8000

# Default env — in Render you will set DEBUG/SECRET/DB via environment
ENV PYTHONUNBUFFERED=1

# Collect static (only if you use staticfiles)
RUN python manage.py collectstatic --noinput || true

# Run migrations at container start then run gunicorn
CMD python manage.py migrate --noinput && gunicorn fb.wsgi:application --bind 0.0.0.0:8000 --workers 3
