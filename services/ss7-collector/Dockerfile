FROM python:3.11-slim

LABEL maintainer="Djezzy SOC Engineering <soc@djezzy.dz>"
LABEL description="SS7/Diameter Signaling Collector - Captures and normalizes telecom signaling messages"
LABEL version="1.0.0"

# Install system dependencies for SCTP/M3UA handling
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpcsclite-dev \
    libssl-dev \
    libpcap-dev \
    tshark \
    tcpdump \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

# Create application user
RUN groupadd -r ss7collector && useradd -r -g ss7collector -d /app -s /sbin/nologin ss7collector

WORKDIR /app

# Copy application code
COPY --chown=ss7collector:ss7collector ./

# Create data directories
RUN mkdir -p /var/capture/ss7 /var/log/ss7 /etc/ss7-collector && \
    chown -R ss7collector:ss7collector /var/capture /var/log/ss7 /etc/ss7-collector

# Expose ports
EXPOSE 2904 2905 3868 7000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:7000/health')" || exit 1

# Run as non-root user
USER ss7collector

# Entry point
ENTRYPOINT ["python", "-m", "ss7_collector"]
CMD ["--config", "/etc/ss7-collector/config.yaml", "--log-level", "INFO"]
