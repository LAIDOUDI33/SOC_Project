# 📦 MODULE 1: Docker Compose Infrastructure Foundation

## 🇩🇿 National SOC Production Platform - Complete Infrastructure Stack

---

## ✅ **Module Status: COMPLETE**

This module provides the complete infrastructure foundation for the National SOC platform using 100% open source tools.

---

## 🏗️ **What's Included**

### **Core Services**

| Service | Version | Purpose | Port | Resources |
|---------|---------|---------|------|-----------|
| **PostgreSQL** | 16 Alpine | Primary Database | 5432 | 4GB RAM, 2 CPU |
| **Redis** | 7 Alpine | Cache & Message Broker | 6379 | 768MB RAM, 1 CPU |
| **Nginx** | Alpine | Reverse Proxy + SSL | 80/443 | 512MB RAM, 1 CPU |
| **MinIO** | Latest | Object Storage | 9000/9001 | 2GB RAM, 1 CPU |

### **Development Tools** (Optional)

| Service | Purpose | Port |
|---------|---------|------|
| **Adminer** | Database Management UI | 8080 |
| **Redis Commander** | Redis Browser UI | 8081 |

---

## 📁 **File Structure**

```
production/
├── docker/
│   ├── docker-compose.yml          # Main orchestration file
│   ├── .env.example                # Environment template
│   ├── postgres/
│   │   ├── postgresql.conf         # Production DB config
│   │   └── init.sql                # Initialization script
│   ├── redis/
│   │   └── redis.conf              # Redis configuration
│   ├── nginx/
│   │   ├── nginx.conf              # Main Nginx config
│   │   ├── conf.d/
│   │   │   └── default.conf        # Server block (SSL + proxy)
│   │   └── includes/
│   │       └── security-headers.conf  # OWASP headers
│   ├── html/
│   │   └── health.html             # Health check page
│   └── ssl/                        # Certificate storage
├── scripts/
│   └── manage.sh                   # Deployment & management CLI
└── README.md                       # This file
```

---

## 🚀 **Quick Start**

### **1. Configure Environment**

```bash
cd production/docker
cp .env.example .env
nano .env  # Edit with your passwords and settings
```

### **Required Variables to Set**

```bash
# Database credentials
POSTGRES_PASSWORD=your_strong_password_here
REDIS_PASSWORD=your_redis_password_here

# Object storage
MINIO_ACCESS_KEY=socadmin
MINIO_SECRET_KEY=minio_secret_8chars_min

# Application secrets
NEXTAUTH_SECRET=your_nextauth_secret_32_chars
JWT_SECRET=your_jwt_secret_for_signing

# SSL (optional)
SSL_DOMAIN=your-domain.com
SSL_EMAIL=admin@your-domain.com
```

### **2. Deploy Infrastructure**

```bash
# From production directory
chmod +x scripts/manage.sh

# Deploy with SSL certificates
./scripts/manage.sh deploy --ssl

# Or deploy without SSL (HTTP only)
./scripts/manage.sh deploy
```

### **3. Verify Deployment**

```bash
# Check service status
./scripts/manage.sh status

# View logs
./scripts/manage.sh logs

# Test health endpoint
curl http://localhost/health
```

---

## 🔧 **Management Commands**

```bash
./scripts/manage.sh <command>

Commands:
  deploy [--ssl|--all]  Deploy full infrastructure stack
  start                 Start all services
  stop                  Stop all services
  restart               Restart all services
  logs [service]        View logs (optionally for specific service)
  status                Show service status and resource usage
  backup                Create database and file backups
  cleanup               Remove all containers and volumes
  ssl                   Setup/renew SSL certificates
  help                  Show help message
```

### **Examples**

```bash
# Full deployment with SSL
./scripts/manage.sh deploy --ssl

# Check PostgreSQL logs
./scripts/manage.sh logs postgres

# View resource usage
./scripts/manage.sh status

# Create backup
./scripts/manage.sh backup

# Start development tools (Adminer, Redis Commander)
docker compose --profile development up -d adminer redis-commander
```

---

## 🔒 **Security Features**

### **Network Isolation**
- `soc-frontend`: Public-facing services (Nginx)
- `soc-backend`: Internal application network (isolated)
- `soc-database`: Dedicated database network (fully isolated)

### **SSL/TLS Configuration**
- TLS 1.2 and TLS 1.3 only
- Modern cipher suite (no legacy ciphers)
- OCSP Stapling for performance
- HSTS with preload
- Automatic Let's Encrypt renewal

### **Security Headers**
- Content Security Policy (CSP)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing)
- Strict Transport Security
- Referrer Policy
- Permissions Policy

### **Rate Limiting**
- General requests: 10 req/s per IP
- Auth endpoints: 3 req/min per IP (brute force protection)
- API endpoints: 30 req/s per IP
- WebSocket: 10 connections per IP

### **Database Security**
- SCRAM-SHA-256 password encryption
- Separate read-only user for monitoring
- Audit logging for all data changes
- Connection limits and timeouts

### **Redis Security**
- Password authentication
- Dangerous commands disabled (FLUSHDB, FLUSHALL, DEBUG, CONFIG)
- Memory limit with LRU eviction

---

## 📊 **Resource Requirements**

### **Minimum (Development)**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 100 GB SSD

### **Recommended (Production)**
- CPU: 8 cores
- RAM: 32 GB
- Disk: 500 GB NVMe SSD

### **Enterprise (High Availability)**
- Multiple servers with load balancing
- PostgreSQL replication (master-replica)
- Redis Sentinel for HA
- Distributed storage (Ceph/S3)

---

## 🔗 **Service Connectivity**

```
External Users
     │
     ▼
┌─────────────┐
│    Nginx    │ :443 (SSL Termination)
│  (Gateway)  │ :80 → Redirect to HTTPS
└──────┬──────┘
       │
       ├──────────────────┬──────────────────┐
       ▼                  ▼                  ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Next.js    │  │ Socket.io   │  │   MinIO     │
│  Dashboard  │  │ Real-time   │  │  File Store │
│    :3000    │  │   :3003     │  │  :9000      │
└──────┬──────┘  └──────┬──────┘  └─────────────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │    Redis    │
│   :5432     │  │   :6379     │
└─────────────┘  └─────────────┘
```

---

## 🛠️ **Configuration Details**

### **PostgreSQL Tuning**
- Optimized for SSD storage
- Connection pooling ready
- WAL for replication support
- Comprehensive audit logging
- Auto-vacuum tuning for high-volume tables

### **Redis Optimization**
- LRU memory policy
- Persistence snapshots (RDB)
- Slow query logging (>10ms)
- Keyspace notifications enabled

### **Nginx Performance**
- Gzip compression (level 6)
- Worker connections: 4096
- Keep-alive optimization
- Static file caching (30 days)

---

## 🔄 **Backup Strategy**

### **Automated Backups**

The backup script creates:
1. **Database dump**: Full SQL export (pg_dumpall)
2. **Redis snapshot**: RDB file copy
3. **MinIO data**: File storage contents

### **Schedule**

Backups should be scheduled via cron:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/manage.sh backup
```

### **Retention**

- Local: 30 days (configurable via `.env`)
- Consider off-site backup to S3-compatible storage

---

## 🐛 **Troubleshooting**

### **Common Issues**

#### Container won't start
```bash
# Check logs
./scripts/manage.sh logs <service-name>

# Check resource usage
docker stats

# Verify .env configuration
cat docker/.env | grep -v "^#" | grep -v "^$"
```

#### Connection refused
```bash
# Check if service is running
./scripts/manage.sh status

# Check port binding
netstat -tlnp | grep -E "5432|6379|80|443"
```

#### Out of memory
```bash
# Check current usage
free -h
docker stats --no-stream

# Reduce resource limits in docker-compose.yml
# Or add more RAM to server
```

### **Health Check Failures**

If health checks fail:
1. Verify all containers are running: `docker compose ps`
2. Check container logs: `docker compose logs`
3. Verify network connectivity between containers
4. Check disk space: `df -h`

---

## 📈 **Next Steps**

After deploying this infrastructure module:

1. **Module 2**: Wazuh SIEM Integration
   - Connect to Wazuh API
   - Ingest security alerts
   - Monitor agent status

2. **Module 3**: TheHive SOAR Integration
   - Case management workflows
   - Task automation
   - Observable extraction

3. **Module 4**: MISP Threat Intelligence
   - IOC synchronization
   - Threat feed aggregation
   - Indicator enrichment

---

## 📞 **Support**

For issues or questions:
- Check logs: `./scripts/manage.sh logs`
- Review documentation in parent directory
- Verify environment variables are correctly set

---

## ✅ **Module Checklist**

- [x] Docker Compose stack with all services
- [x] Environment configuration template
- [x] PostgreSQL production configuration
- [x] Redis security hardening
- [x] Nginx reverse proxy with SSL
- [x] Security headers (OWASP best practices)
- [x] Rate limiting configuration
- [x] Network isolation (3 networks)
- [x] Health check endpoints
- [x] Volume persistence setup
- [x] Deployment automation script
- [x] Backup functionality
- [x] Development tools (optional profile)

---

**Status**: ✅ **READY FOR PRODUCTION DEPLOYMENT**

**Next**: Proceed to **MODULE 2: Wazuh SIEM Integration**
