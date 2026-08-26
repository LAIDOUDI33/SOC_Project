# 🚀 Djezzy National SOC Platform - Guide de Déploiement Production

**Version:** 3.0.0-PRODUCTION  
**Date:** Janvier 2026  
**Classification:** CONFIDENTIEL - Interne Djezzy  
**Environnement Cible:** Production (Algeria Data Center)

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis Infrastructure](#prérequis-infrastructure)
3. [Préparation Environnement](#préparation-environnement)
4. [Configuration Base de Données PostgreSQL](#configuration-base-de-données-postgresql)
5. [Déploiement Application](#déploiement-application)
6. [Configuration Authentification](#configuration-authentification)
7. [Intégrations Télécom](#intégrations-télécom)
8. [Sécurité Hardening](#sécurité-hardening)
9. [Monitoring & Observabilité](#monitoring--observabilité)
10. [Procédures Opérationnelles](#procédures-opérationnelles)
11. [Checklist Pre-Go-Live](#checklist-pre-go-live)
12. [Support & Escalade](#support--escalade)

---

## 1. Vue d'ensemble

### 1.1 Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTERNET / DMZ                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Nginx     │    │   WAF       │    │   CDN       │         │
│  │  (SSL Term) │    │  (Cloudflare)│    │  (Static)   │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────────────┐
│         ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              KUBERNETES CLUSTER                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │   │
│  │  │ Next.js  │  │PostgreSQL│  │  Redis   │  │Prometheus│  │   │
│  │  │ App (x3) │  │  Primary │  │  Cluster │  │ + Grafana│  │   │
│  │  └──────────┘  └────┬─────┘  └──────────┘  └────────┘  │   │
│  │                     │                                  │   │
│  │              ┌──────┴──────┐                           │   │
│  │              │ PostgreSQL  │                           │   │
│  │              │  Replica    │                           │   │
│  │              └─────────────┘                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         INTERNAL NETWORK                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Wazuh   │  │ TheHive  │  │   MISP   │  │ OpenCTI  │      │
│  │   SIEM   │  │   SOAR   │  │    TIP   │  │ Intel    │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└───────────────────────────────────────────────────────────────┘
```

### 1.2 Composants à Déployer

| Composant | Version | Replicas | Ressources |
|-----------|---------|----------|------------|
| **Next.js Application** | 16.x | 3 | 2CPU, 4GB RAM chacun |
| **PostgreSQL** | 16 | 1 primary + 2 replicas | 4CPU, 16GB RAM |
| **Redis** | 7.x | 3 (cluster) | 1CPU, 2GB RAM chacun |
| **Nginx** | 1.24+ | 2 | 1CPU, 512MB RAM |
| **Prometheus** | 2.45+ | 1 | 2CPU, 4GB RAM |
| **Grafana** | 10.x | 1 | 1CPU, 2GB RAM |

### 1.3 URLs de Production

| Service | URL | DNS Record |
|---------|-----|------------|
| **Application principale** | https://soc.djezzy.dz | A record → Load Balancer |
| **API** | https://api.soc.djezzy.dz | CNAME → soc.djezzy.dz |
| **Monitoring Grafana** | https://grafana.soc.internal.dz | Internal DNS |
| **Prometheus** | http://prometheus.soc.internal:9090 | Internal only |

---

## 2. Prérequis Infrastructure

### 2.1 Hardware Minimum

**Pour Kubernetes Cluster (Production):**

```yaml
Master Nodes: 3x
  - CPU: 4 cores minimum (8 recommandés)
  - RAM: 16GB minimum (32GB recommandés)
  - SSD: 100GB RAID 1
  
Worker Nodes: 5x minimum (recommandé: 7+)
  - CPU: 8 cores minimum (16 recommandés)
  - RAM: 32GB minimum (64GB recommandés)
  - SSD: 500GB RAID 10
  - Network: 10Gbps recommended
  
Storage:
  - NFS/iSCSI pour persistent volumes
  - Backup storage: 2TB minimum
```

### 2.2 Logiciels Requis

```bash
# Sur tous les nœuds Kubernetes
- Kubernetes v1.28+
- Container Runtime: containerd 1.7+
- Helm 3.12+
- kubectl configuré

# Pour déploiement initial
- Docker 24.0+ (build images)
- Git 2.40+
- OpenSSL (génération certificats)

# Outils de gestion
- k9s ou Lens (monitoring cluster)
- Velero (backups Kubernetes)
```

### 2.3 Réseau

```yaml
Ports requis (inbound):
  - 80/443: Application (HTTP/HTTPS)
  - 6443: Kubernetes API server (restreint)
  - 2379-2380: etcd (cluster interne uniquement)
  - 10250-10252: kubelet/metrics (interne)
  
Ports requis (outbound):
  - 443: External APIs (Azure AD, etc.)
  - 636: LDAP over TLS (vers AD Djezzy)
  - 5432: PostgreSQL (si externe)
  
DNS:
  - soc.djezzy.dz → Load Balancer IP
  - *.soc.djezzy.dz → Wildcard pour services internes
  
Certificates:
  - SSL wildcard: *.djezzy.dz (Let's Encrypt or internal CA)
  - SAML signing certificate
  - Client certificates for mTLS (optionnel)
```

---

## 3. Préparation Environnement

### 3.1 Cloner le Repository

```bash
# Cloner le projet
git clone https://github.com/LAIDOUDI33/SOC_Project.git
cd National_SOC_Complete_Project

# Vérifier la branche production
git checkout main
git pull origin main

# Vérifier le dernier commit de production
git log --oneline -1
# Devrait montrer: fafb995 PRODUCTION READY
```

### 3.2 Créer les Secrets Kubernetes

```bash
# Créer namespace
kubectl create namespace soc-production

# Générer des secrets aléatoires (NE PAS UTILISER CEUX DU .env.production!)
export JWT_SECRET=$(openssl rand -base64 64)
export REFRESH_SECRET=$(openssl rand -base64 64)
export ENCRYPTION_KEY=$(openssl rand -hex 32)
export DB_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)

# Créer secret Kubernetes
kubectl create secret generic soc-secrets \
  --namespace=soc-production \
  --from-literal=jwt-access-secret="$JWT_SECRET" \
  --from-literal=jwt-refresh-secret="$REFRESH_SECRET" \
  --from-literal=data-encryption-key="$ENCRYPTION_KEY" \
  --from-literal=db-password="$DB_PASSWORD" \
  --from-literal=redis-password="$REDIS_PASSWORD"

# Stocker les secrets dans un vault sécurisé!
echo "⚠️  IMPORTANT: Sauvegarder ces secrets dans HashiCorp Vault!"
```

### 3.3 Préparer les Certificats SSL

```bash
# Option A: Let's Encrypt (recommandé pour public-facing)
certbot certonly --webroot \
  -w /var/www/html \
  -d soc.djezzy.dz \
  -d api.soc.djezzy.dz \
  --email admin@djezzy.dz \
  --agree-tos \
  --non-interactive

# Copier vers Kubernetes secrets
kubectl create secret tls soc-tls-cert \
  --namespace=soc-production \
  --cert=/etc/letsencrypt/live/soc.djezzy.dz/fullchain.pem \
  --key=/etc/letsencrypt/live/soc.djezzy.dz/privkey.pem

# Option B: Certificat interne (pour staging/dev)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout soc-tls.key \
  -out soc-tls.crt \
  -subj "/C=DZ/O=Djezzy/OU=SOC/CN=soc.djezzy.dz"
```

### 3.4 Configurer l'Image Docker

```bash
# Build l'image de production
docker build -t soc-platform:production \
  --build-arg NODE_ENV=production \
  --target=production .

# Taguer pour registry
docker tag soc-platform:production \
  your-registry.djezzy.dz/soc-platform:v3.0.0

# Push vers registry
docker push your-registry.djezzy.dz/soc-platform:v3.0.0
```

---

## 4. Configuration Base de Données PostgreSQL

### 4.1 Déployer PostgreSQL avec Helm

```bash
# Ajouter repo Bitnami
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Installer PostgreSQL HA
helm install postgresql bitnami/postgresql \
  --namespace=soc-production \
  --values=k8s/postgres-values.yaml \
  --set auth.postgresPassword=$(kubectl get secret soc-secrets \
    --namespace=soc-production \
    -o jsonpath='{.data.db-password}' | base64 -d) \
  --set primary.persistence.size=100Gi \
  --set replica.count=2 \
  --set replica.persistence.size=100Gi
```

### 4.2 Initialiser le Schéma

```bash
# Attendre que PostgreSQL soit prêt
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=postgresql \
  --namespace=soc-production \
  --timeout=300s

# Exposer PostgreSQL temporairement pour migration
kubectl port-forward svc/postgresql 5432:5432 \
  --namespace=soc-production &

# Configurer DATABASE_URL localement
export DATABASE_URL="postgresql://postgres:@localhost:5432/soc_production"

# Lancer Prisma migration
npx prisma migrate deploy

# Peupler les données initiales (rôles, permissions, etc.)
npx prisma db seed

# Supprimer le port-forward
kill %1
```

### 4.3 Vérifier la Connexion

```bash
# Tester la connexion depuis un pod
kubectl run pg-test --image=postgres:16 \
  --rm -it --restart=Never \
  --env="PGPASSWORD=$DB_PASSWORD" \
  --namespace=soc-production \
  -- psql -h postgresql -U postgres -d soc_production \
  -c "SELECT count(*) FROM \"User\";"

# Résultat attendu: 0 (base vide, seed à faire)
```

---

## 5. Déploiement Application

### 5.1 Déployer avec Helm

```bash
# Mettre à jour values-production.yaml avec vos configurations
cat > helm/soc-platform/values-custom.yaml << 'EOF'
image:
  repository: your-registry.djezzy.dz/soc-platform
  tag: v3.0.0
  pullPolicy: Always

replicaCount: 3

service:
  type: ClusterIP
  port: 3000

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: soc.djezzy.dz
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: soc-tls-cert
      hosts:
        - soc.djezzy.dz

resources:
  limits:
    cpu: "2"
    memory: "4Gi"
  requests:
    cpu: "500m"
    memory: "1Gi"

env:
  NODE_ENV: "production"
  DATABASE_URL: "postgresql://postgres:${DB_PASSWORD}@postgresql.soc-production.svc.cluster.local:5432/soc_production"
  REDIS_URL: "redis://:${REDIS_PASSWORD}@redis-master.soc-production.svc.cluster.local:6379/0"
  
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
EOF

# Déployer!
helm install soc-platform helm/soc-platform \
  --namespace=soc-production \
  -f helm/soc-platform/values-custom.yaml \
  --wait --timeout=600s
```

### 5.2 Vérifier le Déploiement

```bash
# Vérifier les pods
kubectl get pods -n soc-production

# Attendre que tous les pods soient ready
kubectl rollout status deployment/soc-platform \
  -n soc-production --timeout=300s

# Vérifier les logs
kubectl logs -f deployment/soc-platform -n soc-production

# Vérifier le service
kubectl get ingress -n soc-production
```

### 5.3 Health Check

```bash
# Health check endpoint
curl -k https://soc.djezzy.dz/api/health

# Réponse attendue:
{
  "status": "healthy",
  "version": "3.0.0",
  "timestamp": "2026-01-28T...",
  "uptime": 123.45,
  "components": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "ldap": { "status": "degraded" }, # Normal si pas encore config
    "saml": { "status": "degraded" }
  }
}
```

---

## 6. Configuration Authentification

### 6.1 LDAP / Active Directory (Djezzy Corporate)

**Étape 1: Obtenir les credentials du service account**

Contactez l'équipe IT Djezzy pour obtenir:
- Service Account DN
- Mot de passe service account
- Base DN de recherche
- Groupes DN pour mapping rôles

**Étape 2: Configurer le secret LDAP**

```bash
kubectl create secret generic ldap-credentials \
  --namespace=soc-production \
  --from-literal=bind-dn="CN=soc_service_account,OU=Service Accounts,OU=IT,DC=djezzy,DC=dz" \
  --from-literal=bind-password="CHANGE_ME_REAL_PASSWORD" \
  --from-literal=ca-cert="$(cat /path/to/djezzy-ca.crt)"
```

**Étape 3: Mettre à jour la configuration**

Dans `values-custom.yaml`:
```yaml
ldap:
  enabled: true
  url: "ldaps://ldap-prod.djezzy.dz:636"
  baseDN: "DC=djezzy,DC=dz"
  
roleMapping:
  adminGroup: "CN=SOC_Admins,OU=Groups,OU=Security,DC=djezzy,DC=dz"
  analystGroup: "CN=SOC_Analysts,OU=Groups,OU=Security,DC=djezzy,DC=dz"
```

**Étape 4: Redéployer**

```bash
helm upgrade soc-platform helm/soc-platform \
  -n soc-production \
  -f helm/soc-platform/values-custom.yaml
```

**Étape 5: Tester l'authentification LDAP**

```bash
# Test depuis un pod
kubectl exec -it deployment/soc-platform -n soc-production -- curl \
  -X POST https://localhost:3000/api/auth/ldap/login \
  -H "Content-Type: application/json" \
  -d '{"username":"abenali","password":"USER_PASSWORD"}'
```

### 6.2 SAML SSO (Azure AD)

**Étape 1: Créer une application Azure AD**

1. Aller sur https://portal.azure.com
2. Azure Active Directory > App registrations > New registration
3. Name: "Djezzy-National-SOC-Platform"
4. Redirect URI: `https://soc.djezzy.dz/api/auth/saml/callback`
5. Register

**Étape 2: Configurer SAML**

1. Dans l'application > Manage > Single sign-on > SAML
2. Basic SAML Configuration:
   - Identifier: `https://soc.djezzy.dz`
   - Reply URL: `https://soc.djezzy.dz/api/auth/saml/callback`
3. Attributes & Claims: Configurez selon mapping Djezzy
4. Download Certificate (Base64)

**Étape 3: Configurer le secret SAML**

```bash
# Générer clé SAML pour SP
openssl req -new -x509 -days 3650 -nodes \
  -out saml-sp.crt \
  -keyout saml-sp.key \
  -subj "/C=DZ/O=Djezzy/OU=SOC/CN=soc.djezzy.dz"

kubectl create secret generic saml-certs \
  --namespace=soc-production \
  --from-file=sp-key=saml-sp.key \
  --from-file=sp-cert=saml-sp.crt \
  --from-file=idp-cert=azure-ad-certificate.cer
```

**Étape 4: Mettre à jour la configuration SAML**

```yaml
saml:
  enabled: true
  issuer: "urn:djezzy:soc:platform"
  callbackUrl: "https://soc.djezzy.dz/api/auth/saml/callback"
  idp:
    entityID: "https://sts.windows.net/YOUR_TENANT_ID/"
    ssoUrl: "https://login.microsoftonline.com/YOUR_TENANT_ID/saml2"
```

---

## 7. Intégrations Télécom

### 7.1 Probes SS7/SIGTRAN

```yaml
# Configuration dans values-custom.yaml
telecom:
  ss7Probe:
    enabled: true
    host: "ss7-probe.internal.djezzy.dz"
    port: 2905
    apiKey: "${SS7_API_KEY}"
    
  gtpAnalyzer:
    enabled: true
    host: "gtp-analyzer.internal.djezzy.dz"
    port: 3386
    
  sipMonitor:
    enabled: true
    host: "sip-monitor.internal.djezzy.dz"
    port: 5060
```

### 7.2 SIEM Integration (Wazuh)

```bash
# Créer le secret Wazuh
kubectl create secret generic wazuh-credentials \
  --namespace=soc-production \
  --from-literal=url="https://wazuh-manager.internal.djezzy.dz:55000" \
  --from-literal=username="soc_integration" \
  --from-literal=password="${WAZUH_PASSWORD}"
```

### 7.3 SOAR Integration (TheHive/Cortex)

```bash
kubectl create secret generic soar-credentials \
  --namespace=soc-production \
  --from-literal=thehive-url="https://thehive.internal.djezzy.dz:9000" \
  --from-literal=thehive-api-key="${THEHIVE_API_KEY}" \
  --from-literal=cortex-url="https://cortex.internal.djezzy.dz:9001" \
  --from-literal=cortex-api-key="${CORTEX_API_KEY}"
```

---

## 8. Sécurité Hardening

### 8.1 Nginx Configuration

```nginx
# /etc/nginx/conf.d/soc.djezzy.dz.conf
server {
    listen 443 ssl http2;
    server_name soc.djezzy.dz;

    # SSL/TLS Configuration
    ssl_certificate /etc/letsencrypt/live/soc.djezzy.dz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/soc.djezzy.dz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256...';
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'...";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    location / {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://soc-platform-svc:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/auth/ {
        limit_req zone=login_limit burst=3 nodelay;
        proxy_pass http://soc-platform-svc:3000;
    }
}
```

### 8.2 Kubernetes Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: soc-platform-network-policy
  namespace: soc-production
spec:
  podSelector:
    matchLabels:
      app: soc-platform
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    - to: [] # Allow external egress for APIs
```

### 8.3 Pod Security

```yaml
# Security Context pour les pods
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  
containers:
  - name: soc-platform
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
          - ALL
```

---

## 9. Monitoring & Observabilité

### 9.1 Prometheus + Grafana Stack

```bash
# Deployer kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace=monitoring \
  --set grafana.adminPassword='${GRAFANA_ADMIN_PASSWORD}'

# Importer dashboards SOC
kubectl apply -f monitoring/grafana/dashboards/
```

### 9.2 Alerting Rules

```yaml
# monitoring/prometheus/soc_alerts.yml
groups:
  - name: soc_platform_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on SOC platform"
          
      - alert: DatabaseConnectionFailure
        expr: up{job="postgresql"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL database unavailable"
          
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "SOC platform response time degraded"
```

### 9.3 Logging (ELK Stack)

```yaml
# Fluent Bit pour collecte logs
apiVersion: fluentbit.io/v1alpha2
kind: Filter
metadata:
  name: soc-platform-filter
  namespace: soc-production
spec:
  filters: |
    Filter Parser
      Key_Name log
      Format json
    
    Filter Modify
      Add environment production
      Add service soc-platform
```

---

## 10. Procédures Opérationnelles

### 10.1 Backup Automatisé

```bash
# PostgreSQL backup cronjob
kubectl apply -f k8s/postgresql-backup-cronjob.yaml

# Manual backup
kubectl create job --from=cronjob/pg-backup manual-backup-$(date +%Y%m%d) \
  -n soc-production

# Kubernetes resources backup
velero backup create soc-platform-daily \
  --include-namespaces soc-production \
  --ttl 720h0m0s # 30 days retention
```

### 10.2 Mise à Jour (Rolling Update)

```bash
# 1. Pull nouvelle image
docker pull your-registry.djezzy.dz/soc-platform:v3.0.1

# 2. Mise à jour Helm
helm upgrade soc-platform helm/soc-platform \
  -n soc-production \
  -f helm/soc-platform/values-custom.yaml \
  --set image.tag=v3.0.1

# 3. Surveillance du rollout
kubectl rollout status deployment/soc-platform \
  -n soc-production --timeout=600s

# 4. Vérification post-déploiement
curl -k https://soc.djezzy.dz/api/health

# 5. Rollback si problème
helm rollback soc-platform 1 -n soc-production
```

### 10.3 Échelle Horizontale (HPA)

```bash
# Vérifier HPA status
kubectl get hpa -n soc-production

# Manuel scale up (ex: incident majeur)
kubectl scale deployment soc-platform \
  --replicas=10 -n soc-production

# Auto-scale basé sur charge
# Déjà configuré dans values-custom.yaml (min 3, max 10, target 70% CPU)
```

### 10.4 Gestion des Incidents

```bash
# En cas d'incident critique:

# 1. Vérifier l'état global
kubectl get pods -n soc-production -o wide
kubectl top pods -n soc-production

# 2. Logs en temps réel
kubectl logs -f deployment/soc-platform -n soc-production --tail=100

# 3. Debug pod problématique
kubectl exec -it <pod-name> -n soc-production -- /bin/sh

# 4. Restart si nécessaire
kubectl rollout restart deployment/soc-platform -n soc-production

# 5. Failsafe: Maintenance mode
kubectl patch deployment soc-platform -n soc-production -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name":"soc-platform",
          "env":[{"name":"MAINTENANCE_MODE","value":"true"}]
        }]
      }
    }
  }
}'
```

---

## 11. Checklist Pre-Go-Live

### 11.1 Technical Checklist

- [ ] **Infrastructure**
  - [ ] Kubernetes cluster opérationnel (3 master, 5+ workers)
  - [ ] Persistent volumes provisionnés (PostgreSQL, Redis)
  - [ ] Ingress controller déployé et configuré
  - [ ] Certificats SSL valides (*.djezzy.dz)
  - [ ] DNS configuré (soc.djezzy.dz → LB IP)
  - [ ] Firewall rules appliquées (ports ouverts/restrictions)

- [ ] **Application**
  - [ ] Image Docker buildée et poussée au registry
  - [ ] Secrets Kubernetes créés (tous les passwords/secrets)
  - [ ] Helm chart déployé sans erreur
  - [ ] Tous les pods en état Running/Ready
  - [ ] Health check retourne healthy
  - [ ] Auto-scaling configuré (HPA actif)

- [ ] **Base de données**
  - [ ] PostgreSQL déployé (primary + replicas)
  - [ ] Schéma migré (prisma migrate deploy)
  - [ ] Données initiales peuplées (seed)
  - [ ] Backups automatisés configurés
  - [ ] Connection pool testé sous charge

- [ ] **Authentification**
  - [ ] LDAP connectivité vérifiée (test login)
  - [ ] SAML SSO configuré (Azure AD app créée)
  - [ ] MFA optionnel activé/désactivé selon politique
  - [ ] Rôles et permissions assignés correctement

- [ ] **Intégrations**
  - [ ] Wazuh SIEM connectif et alertes reçues
  - [ ] TheHive SOAR accessible
  - [ ] MISP TIP synchronisé
  - [ ] Telecom probes (SS7/GTP/SIP) intégrés

- [ ] **Monitoring**
  - [ ] Prometheus scraping metrics
  - [ ] Grafana dashboards importées
  - [ ] Alerting rules actives (PagerDuty/Slack configuré)
  - [ ] Logging ELK/Fluent Bit opérationnel
  - [ ] Uptime monitoring (Pingdom/UptimeRobot)

### 11.2 Business Checklist

- [ ] **Documentation**
  - [ ] Guide utilisateur finalisé et distribué
  - [ ] Runbook incidents créé
  - [ ] Procédures escalade documentées
  - [ ] Contacts support (24/7) communiqués

- [ ] **Formation**
  - [ ] Équipe SOC formée à la plateforme
  - [ ] Admin système formé aux opérations
  - [ ] Utilisateurs clés testés (login, navigation)

- [ ] **Compliance**
  - [ ] Rapport ARTP pré-rempli testable
  - [ ] Audit logs activés et accessibles
  - [ ] Politique rétention données configurée
  - [ ] Consentements RGPD collectés (si applicable)

- [ ] **Communication**
  - [ ] Annonce interne envoyée (go-live date/heure)
  - [ ] Support utilisateurs préparé (helpdesk informé)
  - [ ] Plan rollback communiqué aux stakeholders

### 11.3 Sign-off

```
Go-Live Approval:

□ Infrastructure Lead: _________________ Date: _______
□ Security Officer: _________________ Date: _______
□ SOC Manager: _______________________ Date: _______
□ IT Director: ________________________ Date: _______
□ CISO: _____________________________ Date: _______

Target Go-Live Date/Time: ________________________________
```

---

## 12. Support & Escalade

### 12.1 Contacts Support

| Rôle | Nom | Email | Téléphone | Disponibilité |
|------|-----|-------|-----------|---------------|
| **SOC Platform Admin** | TBD | soc-admin@djezzy.dz | +213 XX XXX XXX | 24/7 |
| **Infrastructure Lead** | TBD | infra-lead@djezzy.dz | +213 XX XXX XXX | 8h-18h |
| **Security Officer** | TBD | ciso@djezzy.dz | +213 XX XXX XXX | 24/7 |
| **On-Call Engineer** | Rotation | noc@djezzy.dz | +213 XX XXX XXX | 24/7 |

### 12.2 Escalation Matrix

```
Level 1: SOC Platform Admin
  ↓ Si non résolu < 2h
Level 2: Infrastructure Lead + Security Officer
  ↓ Si critique ou < 1h
Level 3: IT Director + CISO
  ↓ Si impact business majeur
Level 4: DZ Management (Executive)
```

### 12.3 Resources Utiles

- **Repository**: https://github.com/LAIDOUDI33/SOC_Project.git
- **Documentation**: `/docs` directory in repo
- **Runbook**: `docs/RUNBOOK.md`
- **API Documentation**: https://soc.djezzy.dz/api/docs (Swagger)
- **Internal Wiki**: Confluence space "National SOC Platform"

---

## 📞 Support d'Urgence

En cas de incident critique affectant la disponibilité ou sécurité:

1. **Appeler immédiatement**: On-Call Engineer (+213 XX XXX XXX)
2. **Slack**: #soc-incidents-critical
3. **Email**: incident@djezzy.dz (avec sujet URGENT)
4. **PagerDuty**: Trigger alert "SOC Platform Down"

**Temps de réponse garanti (SLA):**
- Critique (P1): < 15 minutes
- Haut (P2): < 1 heure
- Moyen (P3): < 4 heures
- Bas (P4): < 24 heures

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-28  
**Next Review:** 2026-04-28 (Quarterly)  
**Owner:** SOC Platform Team  
**Approved By:** CISO Djezzy
