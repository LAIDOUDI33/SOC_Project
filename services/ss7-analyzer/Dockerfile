FROM python:3.11-slim

LABEL maintainer="Djezzy SOC Engineering <soc@djezzy.dz>"
LABEL description="SS7 Security Analyzer - Real-time attack detection and alerting for telecom signaling"
LABEL version="1.0.0"

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libssl-dev \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

# Create application user
RUN groupadd -r ss7analyzer && useradd -r -g ss7analyzer -d /app -s /sbin/nologin ss7analyzer

WORKDIR /app

# Copy application code
COPY --chown=ss7analyzer:ss7analyzer ./

# Create directories
RUN mkdir -p /var/log/ss7-analyzer /etc/ss7-analyzer/rules /var/models/ss7 && \
    chown -R ss7analyzer:ss7analyzer /var/log/ss7-analyzer /etc/ss7-analyzer /var/models/ss7

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

USER ss7analyzer

ENTRYPOINT ["python", "-m", "ss7_analyzer"]
CMD ["--config", "/etc/ss7-analyzer/config.yaml", "--rules-dir", "/etc/ss7-analyzer/rules"]
