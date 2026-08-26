# Djezzy National SOC Platform - TLS Setup Guide
## Phase 3: TLS Automation with cert-manager

### 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation Steps](#installation-steps)
4. [Certificate Management](#certificate-management)
5. [Security Configuration](#security-configuration)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Troubleshooting](#troubleshooting)
8. [Compliance](#compliance)

---

## Overview

This guide covers the complete TLS certificate automation for the Djezzy National SOC Platform using **cert-manager**. The implementation provides:

- ✅ **Automatic Certificate Issuance** via Let's Encrypt (public) and Internal CA (private)
- ✅ **Automatic Renewal** 15 days before expiration
- ✅ **TLS 1.2/1.3** with strong cipher suites
- ✅ **HSTS** (HTTP Strict Transport Security) with preload
- ✅ **OWASP Security Headers** compliance
- ✅ **mTLS** support for database connections
- ✅ **Monitoring & Alerting** for certificate expiry

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Djezzy SOC Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   NGINX      │    │  cert-       │    │  Let's       │  │
│  │  Ingress     │◄──►│  manager     │◄──►│  Encrypt /   │  │
│  │  Controller  │    │              │    │  Internal CA │  │
│  └──────┬───────┘    └──────────────┘    └──────────────┘  │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ SOC Platform │    │   Grafana    │    │   Kibana     │  │
│  │   (TLS)      │    │   (TLS)      │    │   (TLS)      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Kubernetes Cluster Requirements

- **Kubernetes Version**: 1.25+ (cert-manager v1.14+ requires K8s 1.25+)
- **NGINX Ingress Controller**: Installed and configured
- **DNS Configuration**: 
  - Public domains pointing to Ingress LoadBalancer IP
  - Cloudflare API token (for DNS-01 wildcard challenges)

### Tools Required

```bash
# kubectl - Kubernetes CLI (v1.25+)
kubectl version --client

# helm - Package manager (v3.10+)
helm version

# openssl - For certificate debugging
openssl version
```

---

## Installation Steps

### Step 1: Install cert-manager

```bash
# Add Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager (with CRDs)
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.14.0 \
  --set installCRDs=true \
  --set startupApiWait=true \
  --set startupApiWaitTimeout=5m

# Verify installation
kubectl get pods -n cert-manager
```

Expected output:
```
NAME                                       READY   STATUS    RESTARTS AGE
cert-manager-7d6fbb4b8c-kqz5w             1/1     Running   0        2m
cert-manager-cainjector-f8b4f8df9-xk2lp   1/1     Running   0        2m
cert-manager-webhook-5c7f6c8f89-d9l4m      1/1     Running   0        2m
```

### Step 2: Deploy Infrastructure Manifests

```bash
# Apply namespace and base configuration
kubectl apply -f infrastructure/tls/cert-manager/namespace.yaml

# Deploy ClusterIssuers (Let's Encrypt + Internal CA)
kubectl apply -f infrastructure/tls/issuers/cluster-issuers.yaml

# Verify issuers are ready
kubectl get clusterissuers
```

### Step 3: Create Cloudflare API Secret (for DNS-01)

```bash
# Create secret for Cloudflare DNS challenge
kubectl create secret generic cloudflare-api-token \
  --namespace cert-manager \
  --from-literal=api-token=CLOUDFLARE_API_TOKEN_HERE
```

> ⚠️ **Important**: Replace `CLOUDFLARE_API_TOKEN_HERE` with your actual Cloudflare API token with DNS edit permissions.

### Step 4: Deploy Certificates

```bash
# Apply all certificate resources
kubectl apply -f infrastructure/tls/certificates/certificates.yaml

# Monitor certificate issuance
kubectl get certificates -n soc-platform -w

# Check certificate status
kubectl describe certificate soc-platform-wildcard -n soc-platform
```

### Step 5: Deploy TLS-Enabled Ingress

```bash
# Apply ingress configurations
kubectl apply -f infrastructure/tls/certificates/ingress-tls.yaml

# Verify ingress is configured
kubectl get ingress -n soc-platform
```

### Step 6: Deploy Monitoring Policies

```bash
# Apply certificate policies and alerts
kubectl apply -f infrastructure/tls/policies/certificate-policies.yaml
```

---

## Certificate Management

### Available Certificates

| Certificate Name | Type | Domains | Issuer | Validity |
|-----------------|------|---------|--------|----------|
| `soc-platform-wildcard` | Wildcard | `*.soc.djezzy.dz` | Let's Encrypt Prod | 90 days |
| `soc-api-certificate` | Single | `api.soc.djezzy.dz` | Let's Encrypt Prod | 90 days |
| `soc-internal-certificate` | Internal | `*.internal.djezzy.dz` | Djezzy Internal CA | 365 days |
| `soc-monitoring-certificate` | Multi | `grafana/kibana/prometheus.*` | Let's Encrypt Prod | 90 days |
| `soc-database-mtls-client` | mTLS | DB client auth | Djezzy Internal CA | 365 days |

### Using the Operations Script

```bash
# Make script executable
chmod +x infrastructure/tls/scripts/certificate-operations.sh

# Check status of all certificates
./infrastructure/tls/scripts/certificate-operations.sh status

# Force renewal of specific certificate
./infrastructure/tls/scripts/certificate-operations.sh renew soc-platform-wildcard

# Validate configuration
./infrastructure/tls/scripts/certificate-operations.sh validate

# Debug issues
./infrastructure/tls/scripts/certificate-operations.sh debug soc-api-certificate

# Backup certificates
./infrastructure/tls/scripts/certificate-operations.sh backup

# Emergency key rotation
./infrastructure/tls/scripts/certificate-operations.sh rotate soc-platform-wildcard

# Compliance check
./infrastructure/tls/scripts/certificate-operations.sh compliance
```

---

## Security Configuration

### TLS Protocol Settings

The following configuration enforces strong TLS security:

```yaml
protocols:
  minVersion: "TLSv1.2"  # Minimum required
  maxVersion: "TLSv1.3"  # Latest supported
  ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:..."
  preferServerCiphers: true
```

**Disabled protocols**: SSLv3, TLSv1.0, TLSv1.1 (insecure)

### HSTS Configuration

```yaml
securityHeaders:
  hsts:
    enabled: true
    maxAge: "63072000"        # 2 years in seconds
    includeSubDomains: true   # Apply to all subdomains
    preload: true             # Submit to browser preload list
```

### OWASP Security Headers

All responses include these security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | Enable XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |
| `Content-Security-Policy` | Custom policy | Prevent XSS/injection |
| `Permissions-Policy` | Restrict features | Block camera/mic/etc |

### Rate Limiting

DDoS protection through NGINX annotations:

```yaml
rateLimiting:
  rps: 100           # Requests per second per IP
  connections: 50    # Concurrent connections
  rpm: 5000          # Requests per minute
  burst: 200         # Burst allowance
  statusCode: 429   # Return code when limited
```

---

## Monitoring & Alerting

### Prometheus Metrics

cert-manager exposes these metrics automatically:

- `cert_manager_certificate_expiration_timestamp_seconds` - Expiry time
- `cert_manager_certificate_ready_status` - Ready condition (0 or 1)
- `cert_manager_acme_client_request_duration_seconds` - ACME request timing

### Configured Alerts

| Alert Name | Severity | Condition | Action |
|------------|----------|-----------|--------|
| `CertificateExpiringSoonCritical` | Critical | < 7 days to expiry | Page on-call, Slack #soc-incidents |
| `CertificateExpiringSoonWarning` | Warning | < 30 days to expiry | Slack #soc-ops |
| `CertificateRenewalFailed` | Error | Renewal failed | Auto-ticket, investigate |
| `TLSCipherSuiteDeprecated` | Warning | Weak cipher detected | Review config |
| `TLSVersionInsecure` | Critical | TLSv1.0/1.1 detected | Immediate fix |

### Grafana Dashboard

Import the dashboard from:
```
infrastructure/tls/monitoring/tls-grafana-dashboard.json
```

Dashboard includes:
- Certificate expiry gauge
- Status overview (Ready/Not Ready)
- Days until expiry table
- Renewal timeline chart
- TLS protocol distribution pie chart
- Cipher suite usage bar chart

---

## Troubleshooting

### Common Issues

#### 1. Certificate Not Issuing

```bash
# Check certificate status
kubectl describe certificate <name> -n soc-platform

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager --tail=100

# Common causes:
# - DNS not pointing to cluster
# - Cloudflare API token invalid
# - Let's Encrypt rate limit hit
```

#### 2. Challenge Failed (HTTP-01)

```bash
# Verify ingress controller can receive requests
kubectl get ingress -A

# Test challenge path manually
curl -I http://soc.djezzy.dz/.well-known/acme-challenge/<token>
```

#### 3. Challenge Failed (DNS-01)

```bash
# Verify Cloudflare token works
export CF_TOKEN=$(kubectl get secret cloudflare-api-token -n cert-manager -o jsonpath='{.data.api-token}' | base64 -d)
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CF_TOKEN"
```

#### 4. Certificate Expired Unexpectedly

```bash
# Force immediate renewal
kubectl annotate certificate <name> -n soc-platform \
  cert-manager.io/renewal-force=true --overwrite

# Watch renewal progress
kubectl get certificate <name> -n soc-platform -w
```

### Debug Commands

```bash
# Full debug output
./infrastructure/tls/scripts/certificate-operations.sh debug <certificate-name>

# Validate configuration
./infrastructure/tls/scripts/certificate-operations.sh validate

# Check compliance
./infrastructure/tls/scripts/certificate-operations.sh compliance
```

---

## Compliance

### ARTP (Algeria) Requirements

This TLS configuration meets ARTP cybersecurity requirements:

- ✅ Strong encryption (AES-256-GCM)
- ✅ Secure key exchange (ECDHE)
- ✅ Certificate transparency
- ✅ Regular rotation (90 days max)
- ✅ Audit logging of all operations

### ANSSI (France) Recommendations

Aligned with ANSSI guidelines:

- ✅ TLS 1.2 minimum (RGS recommendations)
- ✅ Forward secrecy (ECDHE cipher suites)
- ✅ HSTS with long max-age
- ✅ OCSP stapling enabled
- ✅ No weak algorithms (RC4, 3DES, etc.)

### Validation Checklist

Run the compliance check regularly:

```bash
# Weekly automated check
./infrastructure/tls/scripts/certificate-operations.sh compliance

# Expected output: COMPLIANT ≥80% score
```

---

## Next Steps

After completing Phase 3 TLS setup:

1. **Phase 4**: Real Data Migration (SQLite → PostgreSQL)
2. **Phase 5**: Backup & Disaster Recovery
3. **Phase 6**: Security Hardening (Network Policies, WAF)

---

## Support & Contacts

- **SOC Operations**: soc-ops@djezzy.dz
- **Security Team**: soc-security@djezzy.dz
- **Certificates**: soc-certificates@djezzy.dz
- **On-Call**: PagerDuty "SOC-Platform" escalation

---

**Document Version**: 1.0  
**Last Updated**: 2026-07-28  
**Classification**: Confidential - Djezzy Internal Use Only
