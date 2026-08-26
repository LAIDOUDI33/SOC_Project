# CyberSOC Platform - Production Helm Chart

![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 2.0.0](https://img.shields.io/badge/AppVersion-2.0.0-informational?style=flat-square)

**AI-Native Security Operations Center Operating System** | 41 Modules | Enterprise-Grade Security | ANRT Compliant

## 🚀 Quick Start

### Prerequisites

- Kubernetes 1.28+ (for PodSecurity Standards)
- Helm 3.12+
- PV provisioner (for persistent storage)
- Ingress Controller (NGINX recommended)

### Installation

```bash
# Add repository (if using remote repo)
helm repo add cybersoc https://laidoudi33.github.io/soc-charts
helm repo update

# Install for Development/Staging
helm install cybersoc ./helm/soc-platform -n cybersoc --create-namespace

# Install for PRODUCTION (CRITICAL: Use production values!)
helm install cybersoc ./helm/soc-platform \
  -n cybersoc \
  --create-namespace \
  -f ./k8s/helm/soc-platform/values-production.yaml \
  --set global.environment=production \
  --set socPlatform.secrets.jwt-secret=$JWT_SECRET \
  --set socPlatform.secrets.encryption-key=$ENCRYPTION_KEY
```

### Upgrade

```bash
# Standard upgrade
helm upgrade cybersoc ./helm/soc-platform -n cybersoc

# Production upgrade (zero-downtime rolling update)
helm upgrade cybersoc ./helm/soc-platform \
  -n cybersoc \
  -f ./k8s/helm/soc-platform/values-production.yaml \
  --set image.tag=2.0.1-production \
  --history-max 10
```

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Ingress    │───▶│ SOC Platform │───▶│     SIEM     │      │
│  │  (NGINX+)    │    │   (Next.js)  │    │  (Wazuh/ES)  │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│                             │                                   │
│              ┌──────────────┼──────────────┐                   │
│              ▼              ▼              ▼                   │
│     ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│     │ PostgreSQL │  │    Redis   │  │   Kafka    │            │
│     │  (Primary+ │  │ (Cluster)  │  │ (9 brokers)│            │
│     │   Replica) │  │            │  │            │            │
│     └────────────┘  └────────────┘  └────────────┘            │
│                            │                                   │
│              ┌─────────────┼─────────────┐                    │
│              ▼             ▼             ▼                    │
│     ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│     │Elasticsearch│  │    SOAR    │  │ Threat Intel│           │
│     │(Hot/Warm/   │  │(TheHive/   │  │(MISP/OpenCTI│          │
│     │ Cold Tier)  │  │ Cortex)    │  │   /TAXII)   │           │
│     └────────────┘  └────────────┘  └────────────┘           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                  Monitoring Stack                        │  │
│  │  Prometheus + Grafana + AlertManager + Thanos           │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🎛️ Configuration

### Global Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.environment` | Environment name | `staging` |
| `global.imageRegistry` | Container registry | `ghcr.io` |
| `global.securityContext.runAsNonRoot` | Run as non-root user | `true` |

### Application Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `socPlatform.replicaCount` | Number of API replicas | `2` (prod: `3`) |
| `socPlatform.image.repository` | Container image | `laidoudi33/soc-platform` |
| `socPlatform.image.tag` | Image tag | `2.0.0-stable` |
| `socPlatform.resources.requests.cpu` | CPU request | `500m` (prod: `2000m`) |
| `socPlatform.resources.requests.memory` | Memory request | `512Mi` (prod: `4Gi`) |

### Feature Flags

| Feature | Description | Default |
|---------|-------------|---------|
| `ss7Monitoring` | SS7/Telco signaling monitoring | `true` |
| `threatHunting` | Advanced threat hunting workspace | `true` |
| `aiCopilot` | AI-powered security assistant | `true` |
| `msspMode` | Multi-tenant MSSP mode | `false` (prod: `true`) |
| `geomarketing` | Geospatial marketing analytics | `true` |

### Database Configuration

| Component | Replicas | Storage | Memory |
|-----------|----------|---------|--------|
| PostgreSQL | 3 (HA) | 1Ti | 8Gi per node |
| Redis | 3 (cluster) | 100Gi | 2Gi per node |
| Elasticsearch | 9 nodes | 6Ti total | Up to 64Gi |
| Kafka | 9 brokers | 2Ti | 16Gi per node |

## 🔒 Security Features

### Built-in Security Controls

✅ **Pod Security Standards** - Restricted profile by default  
✅ **Network Policies** - Zero Trust, default deny all  
✅ **RBAC** - Least privilege service accounts  
✅ **Secrets Management** - External Secrets Operator / Vault support  
✅ **TLS Everywhere** - mTLS between services  
✅ **Audit Logging** - Complete audit trail (7-year retention)  

### Compliance Support

- **ANRT** - Algerian telecom regulations compliance
- **SOC 2 Type II** - Security controls mapping included
- **GDPR** - Data protection and privacy controls
- **NIST CSF** - Framework alignment documented

## 📊 Monitoring & Observability

### Pre-configured Dashboards

1. **SOC Platform Overview** - System health, active users, alert rates
2. **SIEM Pipeline** - EPS throughput, parsing errors, index latency
3. **SOAR Metrics** - Playbook execution, MTTR, automation rate
4. **Infrastructure** - CPU/Memory/Disk across all components
5. **Security Events** - Threat timeline, severity distribution

### Alerting Channels

- PagerDuty (Critical alerts)
- Slack (Warning/Info)
- Email (Daily digests)
- ANRT Portal (Compliance reports)

## 🚢 Deployment Procedures

### Pre-deployment Checklist

- [ ] All secrets configured in Vault/External Secrets
- [ ] DNS records pointing to LoadBalancer IP
- [ ] TLS certificates issued (cert-manager)
- [ ] Database migrations tested on staging
- [ ] Backup of current release (`helm get values`)
- [ ] Rollback plan documented

### Rolling Update Process

```bash
# 1. Verify current state
helm status cybersoc -n cybersoc
kubectl get pods -n cybersoc -w

# 2. Perform upgrade
helm upgrade cybersoc ./helm/soc-platform \
  -n cybersoc \
  -f values-production.yaml \
  --timeout 600s

# 3. Monitor rollout
kubectl rollout status deployment/cybersoc-soc-platform -n cybersoc --timeout=300s

# 4. Verify health
curl -sf https://soc.djezzy.dz/api/health/ready | jq .

# 5. Check metrics
kubectl exec -it deploy/cybersoc-soc-platform -n cybersoc -- curl localhost:3000/api/metrics
```

### Rollback Procedure

```bash
# Quick rollback to previous version
helm rollback cybersoc 1 -n cybersoc

# Or rollback to specific revision
helm rollback cybersoc <revision> -n cybersoc

# Verify rollback completed
helm history cybersoc -n cybersoc
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy CyberSOC to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}
      
      - name: Helm Diff
        uses: docker://dtdanielhernandez/helm-diff:v1.0.5
        with:
          command: upgrade --install cybersoc ./helm/soc-platform -n cybersoc -f values-production.yaml --diff
      
      - name: Helm Deploy
        uses: helm/chart-releaser-action@v1.6.0
        with:
          command: upgrade
          chart: ./helm/soc-platform
          namespace: cybersoc
          values: |
            values-production.yaml
```

### ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cybersoc-platform
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/LAIDOUDI33/SOC_Project.git
    targetRevision: main
    path: k8s/helm/soc-platform
    helm:
      valueFiles:
        - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: cybersoc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## 🆘 Troubleshooting

### Common Issues

**Pod in CrashLoopBackOff**
```bash
# Check logs
kubectl logs -f deploy/cybersoc-soc-platform -n cybersoc

# Describe pod for events
kubectl describe pod -l app.kubernetes.io/name=soc-platform -n cybersoc
```

**High Memory Usage**
```bash
# Check resource usage
kubectl top pods -n cybersoc --sort-by=memory

# Trigger scale-down if needed
kubectl patch hpa cybersoc-soc-platform -n cybersoc --type merge -p '{"spec":{"minReplicas":2}}'
```

**Database Connection Failures**
```bash
# Verify PostgreSQL is running
kubectl get pods -l app.kubernetes.io/name=postgresql -n cybersoc

# Test connectivity from API pod
kubectl exec -it deploy/cybersoc-soc-platform -n cybersoc -- nc -zv postgresql 5432
```

## 📞 Support

- **Documentation**: [Wiki](https://github.com/LAIDOUDI33/SOC_Project/wiki)
- **Issues**: [GitHub Issues](https://github.com/LAIDOUDI33/SOC_Project/issues)
- **Emergency**: soc-oncall@djezzy.dz

## License

Proprietary - Djezzy National SOC Project © 2024-2026

---

**Version**: 1.0.0 | **Last Updated**: {{ .Date }} | **Maintainer**: CyberSOC Platform Team
