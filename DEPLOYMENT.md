# National SOC Platform - Deployment Guide

## Djezzy Production Containerization & Orchestration

This guide covers deploying the **National SOC Platform** to **Djezzy's production infrastructure** using Docker and Kubernetes.

---

## 📁 File Structure

```
/home/z/my-project/
├── Dockerfile                    # Multi-stage production build
├── .dockerignore                 # Build optimization
├── docker-compose.yml            # Development environment
├── docker-compose.prod.yml       # Production with all services
├── deploy.sh                     # Automated deployment script
│
├── nginx/                        # Reverse proxy configuration
│   ├── nginx.conf                # Main Nginx config
│   └── conf.d/default.conf       # Server blocks & security
│
├── k8s/                          # Kubernetes manifests (raw)
│   ├── namespace.yaml            # Namespace definition
│   ├── configmap.yaml            # Non-sensitive configuration
│   ├── secret.yaml               # Secrets template
│   ├── deployment.yaml           # Application deployment
│   ├── service.yaml              # ClusterIP service
│   ├── ingress.yaml              # Ingress controller config
│   ├── hpa.yaml                  # Horizontal Pod Autoscaler
│   ├── pdb.yaml                  # Pod Disruption Budget
│   └── pvc.yaml                  # Persistent Volume Claims
│
└── helm/                         # Helm chart (recommended)
    └── soc-platform/
        ├── Chart.yaml            # Chart metadata
        ├── values.yaml           # Default values
        └── templates/
            ├── _helpers.tpl      # Template helpers
            ├── deployment.yaml   # Deployment template
            ├── service.yaml      # Service template
            ├── ingress.yaml      # Ingress template
            ├── configmap.yaml    # ConfigMap template
            ├── pvc.yaml          # PVC template
            └── autoscaling.yaml  # HPA + PDB templates
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required tools
docker --version        # >= 20.10
kubectl version         # >= 1.25
helm version            # >= 3.12 (optional, recommended)

# Kubernetes cluster access
kubectl cluster-info    # Must show cluster info

# Registry access (if using private registry)
docker login soc.djezzy.dz
```

### Option A: Using Deploy Script (Recommended)

```bash
# 1. Check prerequisites
./deploy.sh check

# 2. Build image
./deploy.sh build

# 3. Push to registry
./deploy.sh push

# 4. Deploy using kubectl
./deploy.sh deploy

# OR deploy using Helm
./deploy.sh deploy-helm

# 5. Check status
./deploy.sh status

# 6. View logs
./deploy.sh logs
```

### Option B: Manual Docker Compose (Development)

```bash
# Development mode (with SQLite)
docker compose up -d

# Development mode (with PostgreSQL)
docker compose --profile postgres up -d

# View logs
docker compose logs -f app
```

### Option C: Manual Kubernetes

```bash
# Apply namespace and configs
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml

# ⚠️ Update secrets first!
# kubectl apply -f k8s/secret.yaml

# Apply storage
kubectl apply -f k8s/pvc.yaml

# Deploy application
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/pdb.yaml
kubectl apply -f k8s/ingress.yaml
```

### Option D: Helm (Production Recommended)

```bash
# Install dependencies
cd helm/soc-platform && helm dependency update && cd ../..

# Install/upgrade
helm upgrade --install soc-platform ./helm/soc-platform \
    --namespace soc-platform \
    --create-namespace \
    --values helm/soc-platform/values-production.yaml \
    --wait \
    --timeout=10m

# Check status
helm status soc-platform -n soc-platform

# Uninstall
uninstall soc-platform -n soc-platform
```

---

## 🔐 Security Configuration

### 1. Generate Secure Secrets

```bash
# Generate random secrets
export JWT_SECRET=$(openssl rand -base64 32)
export REFRESH_SECRET=$(openssl rand -base64 32)
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export ENCRYPTION_KEY=$(openssl rand -hex 16)  # Exactly 32 bytes
export POSTGRES_PASSWORD=$(openssl rand -base64 24)
export REDIS_PASSWORD=$(openssl rand -basejson 24)

# Create Kubernetes secret
kubectl create secret generic soc-platform-secrets \
    --namespace=soc-platform \
    --from-literal=postgres-password=$POSTGRES_PASSWORD \
    --from-literal=redis-password=$REDIS_PASSWORD \
    --from-literal=jwt-secret=$JWT_SECRET \
    --from-literal=jwt-refresh-secret=$REFRESH_SECRET \
    --from-literal=nextauth-secret=$NEXTAUTH_SECRET \
    --from-literal=encryption-key=$ENCRYPTION_KEY \
    --dry-run=client -o yaml | kubectl apply -f -
```

### 2. TLS Certificates

**Option A: Let's Encrypt (Automatic)**
```yaml
# Enable in values.yaml or ingress annotations
cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

**Option B: Djezzy Internal CA**
```bash
# Create TLS secret from certificates
kubectl create secret tls soc-tls-secret \
    --namespace=soc-platform \
    --cert=/path/to/djezzy-fullchain.pem \
    --key=/path/to/djezzy-privkey.pem
```

### 3. Network Policies (Optional but Recommended)

The Helm chart includes network policy templates. Enable them:
```yaml
networkPolicy:
  enabled: true
```

---

## 📊 Monitoring Setup

### Prometheus Metrics

The application exposes metrics at `/api/metrics`. Configure Prometheus scraping:

```yaml
# Add to your Prometheus scrape config
scrape_configs:
  - job_name: 'soc-platform'
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
            - soc-platform
    relabel_configs:
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        action: keep
        regex: http
```

### Grafana Dashboards

Import the provided dashboards from `monitoring/grafana/dashboards/` or create custom ones:

1. **SOC Overview**: Alert volume, incident status, system health
2. **Telecom Metrics**: SS7/GTP/SIP message rates, anomaly detection
3. **Performance**: Response times, error rates, resource utilization
4. **Security**: Failed logins, rate limit hits, suspicious activity

---

## 🔧 Configuration Reference

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | `production` | Yes |
| `DATABASE_URL` | PostgreSQL connection | - | Yes |
| `REDIS_URL` | Redis connection | - | Yes |
| `JWT_SECRET` | JWT signing key | - | Yes |
| `NEXTAUTH_URL` | Public URL | - | Yes |
| `ENCRYPTION_KEY` | AES-256 key (32 bytes) | - | Yes |
| `LDAP_URL` | LDAP server URL | - | No |

### Resource Recommendations

| Component | CPU Request | Memory Request | CPU Limit | Memory Limit |
|-----------|-------------|----------------|-----------|--------------|
| App Pod | 2 cores | 4 GiB | 4 cores | 8 GiB |
| PostgreSQL | 2 cores | 4 GiB | 4 cores | 8 GiB |
| Redis | 1 core | 2 GiB | 2 cores | 4 GiB |
| Nginx | 0.5 core | 512 MiB | 2 cores | 2 GiB |

### Scaling Guidelines

**Horizontal Scaling (HPA)**
- Min replicas: 3 (for high availability)
- Max replicas: 20 (adjust based on traffic)
- Scale up trigger: CPU > 70%, Memory > 80%
- Scale down stabilization: 5 minutes

**Vertical Scaling**
- Monitor resource usage for 1 week before adjusting
- Use VPA (Vertical Pod Autoscaler) for recommendations
- Ensure node pool has sufficient capacity

---

## 🔄 Rollback Procedures

### Using Deploy Script
```bash
# Rollback to previous revision
./deploy.sh rollback

# Rollback to specific revision
./deploy.sh rollback 3
```

### Using kubectl
```bash
# View rollout history
kubectl rollout history deployment/soc-platform -n soc-platform

# Undo last deployment
kubectl rollout undo deployment/soc-platform -n soc-platform

# Rollback to specific revision
kubectl rollout undo deployment/soc-platform -n soc-platform --to-revision=2
```

### Using Helm
```bash
# View history
helm history soc-platform -n soc-platform

# Rollback
helm rollback soc-platform <revision> -n soc-platform
```

---

## 🐛 Troubleshooting

### Common Issues

**Pod not starting (CrashLoopBackOff)**
```bash
# Check pod events
kubectl describe pod <pod-name> -n soc-platform

# View container logs
kubectl logs <pod-name> -n soc-platform --previous
```

**Database connection failed**
```bash
# Verify PostgreSQL is running
kubectl get pods -n soc-platform -l app.kubernetes.io/name=postgres

# Test connectivity from app pod
kubectl exec -it <app-pod> -n soc-platform -- nc -zv postgres-service 5432
```

**Ingress not routing traffic**
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Test ingress endpoint
curl -v https://soc.djezzy.dz/api/health
```

**Secrets not mounted**
```bash
# Verify secret exists
kubectl get secrets soc-platform-secrets -n soc-platform

# Check if secret is referenced correctly
kubectl get configmap soc-platform-config -n soc-platform -o yaml
```

### Health Checks

```bash
# Liveness probe
curl http://localhost:3000/api/health

# Readiness probe
curl http://localhost:3000/api/health

# Full health check (with details)
curl http://localhost:3000/api/system
```

---

## 📋 Pre-Deployment Checklist

- [ ] All secrets generated and stored securely
- [ ] TLS certificates configured
- [ ] Database migrated and seeded
- [ ] Redis instance available
- [ ] DNS records pointing to ingress (`soc.djezzy.dz`)
- [ ] Firewall rules allow port 80/443
- [ ] Monitoring dashboards configured
- [ ] Alert rules set up (PagerDuty/Opsgenie)
- [ ] Backup procedures tested
- [ ] Runbook documented
- [ ] Team trained on new platform
- [ ] Rollback procedure tested
- [ ] Security review completed
- [ ] Performance baseline established

---

## 📞 Support

For issues specific to **Djezzy deployment**:

- **SOC Operations Team**: soc-ops@djezzy.dz
- **Infrastructure Team**: infra@djezzy.dz
- **Security Team**: security@djezzy.dz

For general platform issues:
- **GitHub Issues**: [repository-url]/issues
- **Documentation**: See `/docs/` directory

---

## 📄 License & Compliance

- **Classification**: Confidential (Djezzy Internal)
- **Compliance**: ANSSI, ARTP aligned
- **Data Residency**: Algeria only
- **Retention**: Logs 90 days hot, 1 year cold; Backups 7 years

---

*Last Updated: $(date +%Y-%m-%d)*  
*Version: 1.0.0*
