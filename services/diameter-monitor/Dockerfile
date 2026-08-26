FROM python:3.11-slim

LABEL maintainer="Djezzy SOC Engineering <soc@djezzy.dz>"
LABEL description="Diameter Protocol Monitor - LTE/EPS interface monitoring (S6a, Gx, Rx, Cx)"
LABEL version="1.0.0"

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

# Create user
RUN groupadd -r diamon && useradd -r -g diamon -d /app -s /sbin/nologin diamon
WORKDIR /app

COPY --chown=diamon:diamon ./

RUN mkdir -p /var/log/diameter-monitor && chown diamon:diamon /var/log/diameter-monitor

EXPOSE 3869 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8001/health')" || exit 1

USER diamon

ENTRYPOINT ["python", "-m", "diameter_monitor"]
CMD ["--config", "/etc/diameter-monitor/config.yaml"]
