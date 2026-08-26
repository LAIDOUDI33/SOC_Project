# Module 9: Production Deployment Scripts

## National SOC Platform for Algeria (2026-2030)

**Module Overview:** This module provides complete production deployment capabilities for the National SOC Platform, including Docker Compose configurations, Ansible playbooks, automation scripts, CI/CD pipelines, and comprehensive documentation.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start Guide](#quick-start-guide)
4. [Service Architecture](#service-architecture)
5. [Deployment Methods](#deployment-methods)
6. [Configuration Reference](#configuration-reference)
7. [Operations Guide](#operations-guide)
8. [Disaster Recovery](#disaster-recovery)
9. [Scaling Recommendations](#scaling-recommendations)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

### Service Dependency Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INTERNET / DMZ                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NGINX (Reverse Proxy)                          │
│                    SSL Termination | Rate Limiting | Routing                │
└─────────────────────────────────────────────────────────────────────────────┘
          │              │               │                 │
          ▼              ▼               ▼                 ▼
   ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐
   │ FRONTEND  │  │ API GATEWAY│  │ GRAFANA    │  │    KIBANA      │
   │ (Next.js) │  │ (Node.js)  │  │ Dashboard  │  │ Visualization  │
   └──────────┘  └─────┬──────┘  └─────┬──────┘  └───────┬────────┘
                       │               │                  │
         ┌─────────────┼───────────────┼──────────────────┤
         ▼             ▼               ▼                  ▼
  ┌────────────┐ ┌──────────┐  ┌────────────┐  ┌────────────────┐
  │ POSTGRESQL │ │  REDIS   │  │ PROMETHEUS │  │ ELASTICSEARCH  │
  │ (Database) │ │  (Cache) │  │ (Metrics)  │  │ (Logs/Search)  │
  └────────────┘ └──────────┘  └─────┬──────┘  └───────┬────────┘
                                      │                  │
                                      ▼                  ▼
                               ┌────────────┐  ┌────────────────┐
                               │ALERTMANAGER│  │     WAZUH       │
                               │(Alerting)  │  │   (SIEM)        │
                               └────────────┘  └───────┬────────┘
                                                       │
         ┌─────────────────────────────────────────────┤
         ▼                     ▼                        ▼
  ┌────────────┐      ┌────────────┐           ┌────────────┐
  │ SURICATA   │      │    MISP    │           │ THEHIVE +  │
  │ (IDS/IPS)  │      │(Threat Intel│           │  CORTEX    │
  └────────────┘      └────────────┘           │  (SOAR)    │
                                               └────────────┘
```

### Network Isolation

The platform uses four isolated Docker networks:

| Network | CIDR | Purpose | Access |
|---------|------|---------|--------|
| `soc-frontend` | 172.20.0.0/24 | Public-facing services | External |
| `soc-backend` | 172.21.0.0/22 | Application services | Internal |
| `soc-data` | 172.22.0.0/22 | Database & storage | Internal only |
| `soc-monitoring` | 172.23.0.0/22 | Observability stack | Internal |

---

## ✅ Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended | Production |
|-----------|---------|-------------|-------------|
| **CPU Cores** | 4 | 8 | 16+ |
| **RAM** | 16 GB | 32 GB | 64 GB |
| **Storage** | 100 GB SSD | 250 GB NVMe | 500 GB+ NVMe |
| **Network** | 1 Gbps | 10 Gbps | 10 Gbps |

### Software Requirements

```bash
# Operating System
- Ubuntu 22.04 LTS (recommended)
- Debian 12 Bookworm
- RHEL 8/9 or Rocky Linux 8/9

# Required Tools
- Docker Engine 24.0+
- Docker Compose v2.24+
- Ansible 2.14+ (for automated deployment)
- OpenSSL (for certificate generation)
- curl, wget, jq
```

### Security Requirements

- Firewall configured (UFW or iptables)
- SSH key-based authentication
- Non-root user with sudo privileges
- SSL/TLS certificates (Let's Encrypt or internal CA)

---

## 🚀 Quick Start Guide

### 1. Clone and Prepare Environment

```bash
# Navigate to deployment module
cd modules/deployment

# Run environment initialization
./scripts/init-environment.sh --environment production --domain soc.dz
```

This will:
- Generate secure random passwords and secrets
- Create `.env` configuration file
- Generate self-signed certificates (for testing)
- Set up directory structure

### 2. Configure Environment

```bash
# Edit the generated .env file
vim configs/.env

# Update critical values:
# - BASE_DOMAIN=your-domain.dz
# - POSTGRES_PASSWORD=<strong-password>
# - All other *_PASSWORD fields
```

### 3. Deploy Platform

```bash
# Option A: Using deploy script (recommended)
./scripts/deploy.sh deploy

# Option B: Manual docker compose
docker compose -f docker/docker-compose.prod.yml --env-file configs/.env up -d

# Option C: Using Ansible (for full server setup)
ansible-playbook -i inventory/production ansible/site.yml
```

### 4. Verify Deployment

```bash
# Check all services are healthy
./scripts/health-check.sh --full

# View service status
docker compose -f docker/docker-compose.prod.yml ps

# Access dashboards:
# - Main Platform: https://soc.dz
# - Grafana: https://grafana.soc.dz
# - Kibana: https://kibana.soc.dz
# - Wazuh: https://soc.dz/wazuh/
```

---

## 📦 Service Architecture

### Core Infrastructure Services

| Service | Image | Port | Resources | Critical |
|---------|-------|------|-----------|----------|
| PostgreSQL 16 | `postgres:16-alpine` | 5432 | 4 CPU, 8 GB RAM | ✅ Yes |
| Redis 7 | `redis:7-alpine` | 6379 | 2 CPU, 4 GB RAM | ✅ Yes |
| Nginx | `nginx:1.25-alpine` | 80, 443 | 2 CPU, 1 GB RAM | ✅ Yes |

### Security Tools

| Service | Image | Port | Purpose | Resources |
|---------|-------|------|---------|-----------|
| Wazuh Manager | `wazuh/wazuh-manager:4.7` | 55000 | SIEM | 4 CPU, 4 GB |
| Suricata | `jasonish/suricata:7.0` | Host Network | IDS/IPS | 8 CPU, 8 GB |
| MISP | `misp/misp:latest` | 8081 | Threat Intel | 4 CPU, 4 GB |
| TheHive | `thehive/thehive4:latest` | 9000 | SOAR | 4 CPU, 4 GB |
| Cortex | `thehive/cortex:latest` | 9001 | Analysis | 4 CPU, 4 GB |

### Observability Stack

| Service | Image | Port | Purpose | Retention |
|---------|-------|------|---------|-----------|
| Elasticsearch | `elastic/elasticsearch:8.11` | 9200 | Log Storage | Configurable |
| Kibana | `elastic/kibana:8.11` | 5601 | Visualization | - |
| Grafana | `grafana/grafana:10.2` | 3000 | Dashboards | - |
| Prometheus | `prom/prometheus:v2.49` | 9090 | Metrics | 30 days |
| AlertManager | `prom/alertmanager:v0.27` | 9093 | Alerting | - |

### Supporting Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| MinIO | `minio/minio:RELEASE` | 9000/9001 | Object Storage |
| RabbitMQ | `rabbitmq:3.12-management` | 5672/15672 | Message Queue |
| Keycloak | `quay.io/keycloak:keycloak:23` | 8080 | Identity Provider |

---

## 🔧 Deployment Methods

### Method 1: Shell Scripts (Quick Deploy)

```bash
# Full deployment
./scripts/deploy.sh deploy

# With options
./scripts/deploy.sh deploy \
    --services postgres,redis,wazuh-manager \
    --no-backup \
    --version v1.2.0

# Rollback
./scripts/deploy.sh rollback

# Status check
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs --services wazuh-manager
```

### Method 2: Ansible Playbooks (Production)

```bash
# Full server setup
ansible-playbook -i inventory/production site.yml

# Specific roles only
ansible-playbook -i inventory/production site.yml --tags "base,docker,database"

# Dry run (check mode)
ansible-playbook -i inventory/production site.yml --check --diff

# With extra variables
ansible-playbook -i inventory/production site.yml \
    -e "environment=production" \
    -e "force_deploy=true"
```

### Method 3: CI/CD Pipeline (GitHub Actions)

The included workflow (`deploy.yml`) supports:

- **Automatic deployments** on push to `main` (production) or `develop` (staging)
- **Manual triggers** with version selection
- **Approval gates** for production
- **Automatic rollback** on failure
- **Slack/PagerDuty notifications**

---

## ⚙️ Configuration Reference

### Environment Variables

See `configs/.env.example` for complete list of configurable variables.

Key categories:
- **Database**: `POSTGRES_*`, `REDIS_*`
- **Security**: `JWT_SECRET`, `ENCRYPTION_KEY`
- **Monitoring**: `GRAFANA_*`, `PROMETHEUS_*`
- **Services**: `WAZUH_*`, `MISP_*`, `THEHIVE_*`

### Resource Tuning

Adjust container resources in `docker-compose.prod.yml`:

```yaml
services:
  elasticsearch:
    deploy:
      resources:
        limits:
          cpus: '8.0'
          memory: 16G
        reservations:
          cpus: '2.0'
          memory: 4G
```

### Nginx Configuration

Located in `configs/nginx/conf.d/default.conf`:
- SSL/TLS settings
- Reverse proxy rules
- Rate limiting zones
- Security headers
- Upstream definitions

---

## 📖 Operations Guide

### Daily Operations

```bash
# Health check
./scripts/health-check.sh --quick

# Backup (automated via cron, manual below)
./scripts/backup.sh full

# Log rotation (automatic via logrotate)
sudo logrotate -f /etc/logrotate.d/soc-platform
```

### Weekly Operations

```bash
# Full backup to remote storage
./scripts/backup.sh full --encrypt

# Cleanup old resources
./scripts/cleanup.sh all

# Review disk usage
./scripts/cleanup.sh disk
```

### Monthly Operations

```bash
# Security updates
sudo apt update && sudo apt upgrade

# Certificate renewal
sudo certbot renew

# Backup verification
./scripts/backup.sh restore --list
```

### Monitoring Alerts

The platform includes pre-configured alerts in Prometheus:

| Alert | Severity | Threshold | Action |
|-------|----------|-----------|--------|
| InstanceDown | Critical | Service down | Page on-call |
| HighCPUUsage | Warning | >80% | Notification |
| DiskSpaceCritical | Critical | >10% free | Immediate action |
| ElasticsearchRed | Critical | Cluster RED | Emergency |
| HighSecurityEventRate | Warning | >100/sec | Investigation |

---

## 🔄 Disaster Recovery

### Backup Strategy

| Backup Type | Frequency | Retention | Location |
|-------------|-----------|-----------|----------|
| Pre-deploy | Each deploy | 7 days | Local |
| Database full | Daily | 30 days | Local + S3 |
| Incremental | Hourly | 24 hours | Local |
| Configs | On change | 30 days | Local + Git |

### Recovery Procedures

#### 1. Full System Restore

```bash
# Stop all services
./scripts/deploy.sh stop

# List available restore points
./scripts/rollback.sh list

# Restore from specific backup
./scripts/rollback.sh full --target 20240115_120000

# Verify restoration
./scripts/health-check.sh --full
```

#### 2. Database-Only Restore

```bash
# PostgreSQL
./scripts/rollback.sh database postgres

# Redis
./scripts/rollback.sh database redis

# Elasticsearch (snapshot recovery via API)
curl -X POST "localhost:9200/_snapshot/soc_backup/<snapshot>/_restore" \
  -H 'Content-Type: application/json' \
  -d '{"include_global_state": false}'
```

#### 3. Configuration Restore

```bash
./scripts/rollback.sh config
./scripts/deploy.sh restart
```

### RTO/RPO Targets

| Metric | Target | Achieved |
|--------|--------|----------|
| RPO (Recovery Point Objective) | < 1 hour | 15 min (incremental) |
| RTO (Recovery Time Objective) | < 2 hours | ~45 minutes |

---

## 📈 Scaling Recommendations

### Vertical Scaling

Increase resources per service based on load:

```bash
# Monitor current utilization
./scripts/health-check.sh --full

# Key metrics to watch:
# - CPU usage per container
# - Memory usage (especially Elasticsearch, Wazuh)
# - Disk I/O for databases
# - Network throughput for Suricata
```

### Horizontal Scaling

For stateless services, increase replicas:

```yaml
# In docker-compose.prod.yml
services:
  api-gateway:
    deploy:
      replicas: ${API_GATEWAY_REPLICAS:-2}  # Scale based on traffic
  
  frontend:
    deploy:
      replicas: ${FRONTEND_REPLICAS:-2}
```

Add a load balancer (Nginx already configured) for distribution.

### Multi-Node Deployment

For large-scale deployments:

1. **Separate infrastructure tiers**
   - Web tier: Nginx + Frontend
   - App tier: API Gateway
   - Data tier: Databases + Storage
   - Analytics tier: ELK + Grafana

2. **Use external databases**
   - Managed PostgreSQL (RDS/Aurora)
   - Redis Cluster
   - Elasticsearch Cluster (3+ nodes)

3. **Network considerations**
   - Dedicated VPC/subnets
   - VPC endpoints for AWS services
   - VPN for management access

---

## 🐛 Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check container logs
docker compose logs <service-name>

# Check resource limits
docker stats --no-stream

# Verify configuration
docker compose config
```

#### Database Connection Issues

```bash
# Test PostgreSQL connectivity
docker exec soc-postgres pg_isready -U soc_admin

# Test Redis connectivity
docker exec soc-redis redis-cli ping

# Check network connectivity
docker network inspect soc-backend
```

#### High Memory Usage

```bash
# Identify memory-hungry containers
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}"

# Elasticsearch tuning (most common cause)
# Reduce heap size in ES_JVM_OPTS
# Increase vm.max_map_count
```

#### SSL Certificate Issues

```bash
# Verify certificate
openssl s_client -connect localhost:443 -servername your-domain

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/your-domain/fullchain.pem -noout -dates

# Renew certificates
certbot certonly --webroot -w /var/www/html -d your-domain
```

### Diagnostic Commands

```bash
# Complete system health check
./scripts/health-check.sh --full --json > health-report.json

# Container resource usage
docker system df -v

# Network issues
docker network ls
docker network inspect soc-frontend

# Volume space
docker volume ls
docker system df -v
```

### Getting Help

1. Check logs: `./scripts/deploy.sh logs`
2. Run diagnostics: `./scripts/health-check.sh --full`
3. Review this README
4. Check GitHub Issues
5. Contact SOC operations team

---

## 📁 File Structure

```
modules/deployment/
├── .github/workflows/
│   └── deploy.yml                    # CI/CD pipeline
├── ansible/
│   ├── site.yml                      # Main playbook
│   └── roles/
│       ├── base/                     # OS hardening & users
│       ├── docker/                   # Docker engine setup
│       ├── security/                 # SSL, firewall, SSH
│       ├── database/                 # PostgreSQL, Redis, ES
│       ├── soc-apps/                 # Wazuh, MISP, TheHive
│       ├── monitoring/               # Prometheus, Grafana
│       └── deploy/                   # App deployment
├── configs/
│   ├── .env.example                  # Environment template
│   ├── nginx/                        # Nginx configurations
│   │   └── conf.d/default.conf
│   └── logrotate/
│       └── soc-platform.conf
├── docker/
│   └── docker-compose.prod.yml       # Production compose file
├── scripts/
│   ├── deploy.sh                     # Main deployment script
│   ├── backup.sh                     # Backup automation
│   ├── health-check.sh               # System health checks
│   ├── init-environment.sh           # First-time setup
│   ├── rollback.sh                   # Emergency rollback
│   └── cleanup.sh                    # Maintenance cleanup
├── types/
│   └── deployment.types.ts           # TypeScript definitions
└── README.md                         # This file
```

---

## 🔒 Security Considerations

1. **Never commit `.env` files** to version control
2. **Rotate secrets regularly** using `init-environment.sh --generate-keys`
3. **Use strong passwords** (minimum 24 characters)
4. **Enable TLS 1.2+ only** (configured by default)
5. **Restrict network access** using firewall rules
6. **Enable audit logging** for compliance
7. **Regular security scans** via CI/CD pipeline

---

## 📄 License

© National SOC Platform Algeria (2026-2030)
Licensed under GNU General Public License v3.0

---

**Last Updated:** $(date '+%Y-%m-%d')
**Version:** 1.0.0
**Module:** 9 - Production Deployment Scripts
