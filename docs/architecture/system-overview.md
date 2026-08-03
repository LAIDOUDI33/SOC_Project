# Djezzy National SOC Platform - System Architecture

**Document ID:** SOC-ARCH-001  
**Version:** 2.0  
**Classification:** Internal Use Only  
**Last Updated:** January 2025  
**Owner:** Djezzy National SOC Architecture Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [High-Level Architecture Diagram](#high-level-architecture-diagram)
4. [Component Architecture](#component-architecture)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Technology Stack](#technology-stack)
7. [Infrastructure Architecture](#infrastructure-architecture)
8. [Security Architecture](#security-architecture)
9. [Integration Architecture](#integration-architecture)
10. [Technology Decisions and Rationale](#technology-deisions-and-rationale)

---

## Executive Summary

### Platform Purpose

The Djezzy National Security Operations Center (SOC) Platform is a comprehensive cybersecurity monitoring, detection, and response solution designed specifically for telecommunications environments. It provides 24/7/365 security monitoring for Djezzy's network infrastructure, protecting over 16 million subscribers and critical national telecommunications assets.

### Key Capabilities

| Capability | Description | Business Value |
|------------|-------------|----------------|
| **Real-time Monitoring** | Continuous surveillance of 39 services across 26 containers | Rapid threat detection |
| **Threat Detection** | SIEM-driven correlation with 15 integrated security tools | Reduced mean time to detect |
| **Incident Response** | SOAR-automated playbooks with case management | Faster incident resolution |
| **Threat Intelligence** | Integration with MISP/OpenCTI for proactive defense | Threat-informed defense |
| **Telecom-Specific** | Fraud detection, SS7 monitoring, probe management | Protection of telecom-specific threats |
| **Compliance** | ANRT reporting, data protection, audit support | Regulatory compliance |

### Scale and Scope

```
PLATFORM AT A GLANCE:
=====================

Total Services:        39 microservices
Total Containers:       26 Kubernetes pods (typical deployment)
Security Tools:        15 integrated tools
Data Sources:           50+ log/event sources
Daily Events Processed: ~500 million events
Alert Volume:            ~50,000 alerts/day (pre-correlation)
Analyst Users:          25+ concurrent users
Uptime Target:          99.9% (8.76 hours downtime/year max)
RPO:                   15 minutes (database), 1 hour (logs)
RTO:                   1 hour (critical systems), 4 hours (full platform)
```

---

## Architecture Overview

### Architectural Principles

The Djezzy SOC Platform is built on these core principles:

```
ARCHITECTURAL PRINCIPLES:
==========================

1. DEFENSE IN DEPTH
   ┌─────────────────────────────────────────────────────────────┐
   │ Multiple security layers ensure no single point of failure │
   │ in detection or protection capabilities.                  │
   └─────────────────────────────────────────────────────────────┘

2. SCALABILITY & PERFORMANCE
   ┌─────────────────────────────────────────────────────────────┐
   │ Horizontal scaling handles event volume growth;           │
   │ performance-optimized for real-time analysis.             │
   └─────────────────────────────────────────────────────────────┘

3. RESILIENCE & AVAILABILITY
   ┌─────────────────────────────────────────────────────────────┐
   │ Redundant components, automated failover, and DR site     │
   │ ensure continuous operations.                              │
   └─────────────────────────────────────────────────────────────┘

4. SECURITY BY DESIGN
   ┌─────────────────────────────────────────────────────────────┐
   │ Security embedded in every layer; encryption, access      │
   │ controls, and audit logging throughout.                   │
   └─────────────────────────────────────────────────────────────┘

5. TELECOM-AWARE
   ┌─────────────────────────────────────────────────────────────┐
   │ Purpose-built for telecom environment with specialized    │
   │ fraud detection, signaling analysis, and subscriber       │
   │ data protection.                                          │
   └─────────────────────────────────────────────────────────────┘

6. COMPLIANCE READY
   ┌─────────────────────────────────────────────────────────────┐
   │ Built to meet ANRT regulatory requirements with built-in   │
   │ reporting, data masking, and audit capabilities.          │
   └─────────────────────────────────────────────────────────────┘
```

### Architecture Patterns Used

| Pattern | Application | Benefit |
|---------|-------------|---------|
| **Microservices** | Application layer | Independent scaling, fault isolation |
| **Event-Driven** | Data pipeline | Decoupled processing, async handling |
| **CQRS** | Read/write separation | Optimized queries, write scalability |
| **API Gateway** | External interface | Centralized auth, rate limiting |
| **Sidecar** | Logging/metrics | Language-agnostic observability |

---

## High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "External Sources"
        ED[Endpoints<br/>OSQuery Agents]
        NW[Network<br/>Suricata/Zeek]
        TP[Telecom Probes<br/>SS7/Diameter]
        TI[Threat Intel<br/>MISP/OpenCTI]
        EX[External APIs<br/>ANRT/Vendors]
    end

    subgraph "Ingestion Layer"
        KF[Kafka Cluster<br/>Event Buffering]
        LB[Load Balancer<br/>Caddy/Nginx]
    end

    subgraph "Application Layer"
        API[API Gateway<br/>Next.js/Express]
        WS[WebSocket Server<br/>SSE Streams]
        W1[Worker: Alert Processing]
        W2[Worker: Log Ingestion]
        W3[Worker: Report Generation]
        W4[Worker: Notification]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Primary + Replica)]
        ES[(Elasticsearch<br/>Cluster)]
        RD[(Redis<br/>Cache + Queue)]
        VLT[(HashiCorp Vault<br/>Secrets)]
    end

    subgraph "Security Tools"
        WH[Wazuh SIEM<br/>Manager + Agents]
        TH[TheHive SOAR<br/>Case Management]
        CX[Cortex<br/>Analysis Engines]
        GR[GRR<br/>Remote IR]
        AK[Arkime<br/>PCAP Analysis]
        OV[OpenVAS<br/>Vuln Scanning]
        DD[DefectDojo<br/>Vuln Mgmt]
    end

    subgraph "Presentation Layer"
        UI[Web Dashboard<br/>React/Next.js]
        MB[Mobile View<br/>Responsive]
        API_EXT[REST API<br/>External Consumers]
    end

    --> LB
    ED --> KF
    NW --> KF
    TP --> KF
    TI --> TH
    
    LB --> API
    API --> PG
    API --> ES
    API --> RD
    
    KF --> W2
    W2 --> ES
    W2 --> PG
    
    W1 --> ES
    W1 --> TH
    W1 --> RD
    
    TH --> CX
    TH --> GR
    AK --> ES
    
    UI --> API
    UI --> WS
    MB --> API
    API_EXT --> API
    
    PG -.->|Replication| PG_DR[(DR Site<br/>PostgreSQL)]
    ES -.->|Snapshot Replication| ES_DR[(DR Site<br/>Elasticsearch)]
```

---

## Component Architecture

### Microservices Inventory

#### Core Services (12)

| Service | Port | Function | Dependencies |
|---------|------|----------|--------------|
| `soc-platform` | 3000 | Main web application | PostgreSQL, Redis, Elasticsearch |
| `api-gateway` | 3001 | REST API endpoints | All backend services |
| `auth-service` | 3002 | Authentication/LDAP/SAML | LDAP, Vault |
| `alert-service` | 3003 | Alert management | PostgreSQL, Elasticsearch |
| `incident-service` | 3004 | Incident CRUD | PostgreSQL, TheHive |
| `metrics-service` | 3005 | Metrics aggregation | Elasticsearch, Prometheus |
| `threat-service` | 3006 | Threat intel management | MISP, OpenCTI |
| `telecom-service` | 3007 | Telecom-specific logic | Probe Manager, Fraud Engine |
| `analytics-service` | 3008 | ML/AI analytics | Elasticsearch, Python ML |
| `report-service` | 3009 | Report generation | PostgreSQL, PDF generator |
| `notification-service` | 3010 | Email/pager notifications | SMTP, PagerDuty API |
| `stream-service` | 3011 | Real-time SSE/WebSocket | Redis Pub/Sub |

#### Worker Services (8)

| Worker | Function | Trigger | Resources |
|--------|----------|---------|-----------|
| `alert-processor` | Correlate events → alerts | Kafka queue | High memory (rule engine) |
| `log-shipper` | Forward logs to ES | Kafka queue | High I/O |
| `enrichment-worker` | Enrich IOCs from TI | Alert creation | Network intensive |
| `case-sync` | Sync TheHive cases | Periodic | Low resources |
| `report-generator` | Generate scheduled reports | Cron schedule | CPU/Memory spikes |
| `cleanup-worker` | Purge old data | Cron schedule | Low resources |
| `archive-worker` | Compress/archive old indices | Schedule | I/O intensive |
| `health-checker` | Monitor all services | Periodic | Minimal |

#### Infrastructure Services (19)

| Service | Technology | Purpose |
|---------|-----------|---------|
| PostgreSQL | 16 (Patroni) | Primary database |
| pgBouncer | Connection pooler | DB connection management |
| Elasticsearch | 8.x cluster | Log storage/search |
| Redis | 7.x Cluster | Cache, sessions, queues |
| Kafka | 3.x Cluster | Event streaming |
| Zookeeper | 3.x | Kafka coordination |
| Wazuh Manager | 4.x | SIEM core |
| Wazuh Agents | 4.x | Endpoint collection |
| TheHive | 5.x | Case management |
| Cortex | 3.x | Analysis engines |
| Suricata | 7.x | IDS/IPS |
| Zeek | 6.x | NSM |
| Arkime | 5.x | Full packet capture |
| GRR | 3.x | Remote live forensics |
| OSQuery | 5.x | Endpoint telemetry |
| OpenVAS | 22.x | Vulnerability scanning |
| DefectDojo | 2.x | Vulnerability management |
| MISP | 2.x | Threat intelligence |
| OpenCTI | 5.x | Advanced threat intel |
| Prometheus | - | Metrics collection |
| Grafana | 10.x | Dashboards/alerting |
| Caddy/Nginx | - | Reverse proxy/TLS |
| HashiCorp Vault | - | Secrets management |

### Container Deployment Model

```yaml
# kubernetes/deployment-model.yml
deployments:
  soc-platform:
    replicas: 3
    resources:
      requests:
        cpu: "250m"
        memory: "512Mi"
      limits:
        cpu: "1000m"
        memory: "1Gi"
    strategy:
      type: RollingUpdate
      rollingUpdate:
        maxSurge: 1
        maxUnavailable: 0
        
  soc-platform-backend:
    replicas: 3
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "2000m"
        memory: "2Gi"
        
  alert-processor:
    replicas: 2
    resources:
      requests:
        cpu: "1000m"
        memory: "2Gi"
      limits:
        cpu: "4000m"
        memory: "4Gi"
    # Higher resources due to rule correlation load
    
  elasticsearch-data:
    replicas: 3
    resources:
      requests:
        cpu: "2000m"
        memory: "8Gi"
      limits:
        cpu: "4000m"
        memory: "16Gi"
    # JVM heap sizing critical for ES performance
    
  postgresql:
    replicas: 1  # Managed by Patroni
    resources:
      requests:
        cpu: "2000m"
        memory: "4Gi"
      limits:
        cpu: "4000m"
        memory: "8Gi"
```

---

## Data Flow Architecture

### Event Processing Pipeline

```
EVENT LIFECYCLE:
==================

┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  SOURCE  │────▶│ INGEST   │────▶│ PROCESS  │────▶│ STORE   │
│          │     │          │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                    │                 │                 │
                    ▼                 ▼                 ▼
              ┌──────────┐     ┌──────────┐     ┌──────────┐
              │  Kafka   │     │  Workers │     │   ES /   │
              │  Cluster │     │          │     │   PG     │
              └──────────┘     └──────────┘     └──────────┘
                    │                 │                 │
                    │                 ▼                 │
                    │          ┌──────────┐            │
                    │          │  ALERT   │            │
                    │          │ GENERATE │            │
                    │          └─────┬────┘            │
                    │                │                 │
                    │                ▼                 │
                    │          ┌──────────┐            │
              ┌─────┴──────────│  THEHIVE  │────────────┘
              │               │  CASES   │
              │               └──────────┘
              │
              ▼
     ┌──────────────────┐
     │   ANALYSIS &     │
     │   RESPONSE       │
     │                  │
     │  ┌────────────┐  │
     │  │  Cortex    │  │
     │  │  Analysis  │  │
     │  └────────────┘  │
     │  ┌────────────┐  │
     │  │  Analyst   │  │
     │  │  Review    │  │
     │  └────────────┘  │
     └──────────────────┘
```

### Data Flow by Source Type

#### Endpoint Data Flow

```
ENDPOINT DATA FLOW:
===================

OSQuery Agent (on endpoint)
       │
       │ JSON over TLS/433
       ▼
Wazuh Agent (local)
       │
       │ Encrypted channel
       ▼
Wazuh Manager
       │
       ├──▶ Decoded Events ──▶ Kafka (wazuh-events topic)
       │
       └──▶ Alerts ──────────▶ Kafka (alerts topic)
                               │
                               ▼
                        Alert Processor Worker
                               │
                               ├──▶ Enrich with threat intel
                               ├──▶ Correlate with other events
                               ├──▶ Score severity
                               │
                               ▼
                        ┌─────┴─────┐
                        │           │
                        ▼           ▼
                   Elasticsearch  PostgreSQL
                   (raw+alerts)  (cases, config)
```

#### Network Data Flow

```
NETWORK DATA FLOW:
==================

Network TAP/SPAN
       │
       │ Mirror port
       ▼
   ┌────┴────┐
   │         │
   ▼         ▼
Suricata   Zeek
(IPS)     (NSM)
   │         │
   │ Alerts  │ Logs (conn, dns, http, ssl, files...)
   │         │
   └────┬────┘
        │
        ▼
   Kafka (network-events topic)
        │
        ▼
   Network Processor
        │
        ├──▶ Suricata alerts → Alert generation
        ├──▶ Zeek logs → Elasticsearch (zeek-* indices)
        └──▶ Files extracted → VirusTotal/Cortex scan
                                │
                                ▼
                         Arkime (PCAP storage)
                         Full packet capture for investigation
```

#### Telecom-Specific Data Flow

```
TELECOM DATA FLOW:
==================

SS7/Diameter Signaling
       │
       ▼
Signaling Firewall
       │
       │ Filtered + logged
       ▼
Probe Manager
       │
       ├──▶ Normalized events → Kafka (telecom-events)
       ├──▶ Fraud indicators → Fraud Detection Engine
       └──▶ Anomalies → Alert generation
                                │
                                ▼
                     Telecom Service Processing
                                │
                                ├──▶ Roaming anomalies
                                ├──▶ SIM swap attempts
                                ├──▶ Location tracking abuse
                                └──▶ Premium rate fraud
```

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework (SSR) |
| React | 18.x | UI library |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 3.x | Utility-first CSS |
| shadcn/ui | Latest | Component library |
| Recharts | 2.x | Data visualization |
| Socket.io | 4.x | Real-time communication |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 LTS | Runtime environment |
| Express/Fastify | 4.x/4.x | HTTP server framework |
| Prisma ORM | 5.x | Database abstraction |
| Bull/BullMQ | 4.x | Job queues (Redis-based) |
| ioredis | 5.x | Redis client |
| @elastic/elasticsearch | 8.x | ES client |
| JWT | 9.x | Token authentication |
| Zod | 3.x | Schema validation |

### Infrastructure Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Kubernetes | 1.29+ | Container orchestration |
| Helm | 3.x | Package manager |
| Docker | 24.x | Container runtime |
| Istio (optional) | 1.20+ | Service mesh |
| Caddy | 2.7+ | Reverse proxy/TLS |
| Prometheus | 2.50+ | Metrics |
| Grafana | 10.x | Visualization |
| HashiCorp Vault | 1.15+ | Secrets management |

### Security Tool Versions

| Tool | Version | Role |
|------|---------|------|
| Wazuh | 4.7.3 | SIEM |
| Suricata | 7.0.3 | IDS/NSM |
| Zeek | 6.3.0 | Protocol analyzer |
| Arkime | 5.4.0 | PCAP analysis |
| TheHive | 5.3.2 | Case management |
| Cortex | 3.2.1 | Analysis |
| MISP | 2.4.170 | Threat intel |
| OpenCTI | 5.11.4 | Advanced TI |
| GRR | 3.4.8.1 | Remote IR |
| OSQuery | 5.13.2 | Endpoint visibility |
| OpenVAS | 22.4.0 | Vuln scanning |
| DefectDojo | 2.39.0 | Vuln management |

---

## Infrastructure Architecture

### Kubernetes Cluster Design

```yaml
# infrastructure/k8s-cluster-spec.yml
cluster:
  name: djezzy-soc-prod
  version: "1.29"
  region: algeria-central
  
node_pools:
  - name: general
    instance_type: c5.2xlarge  # 8 vCPU, 16GB RAM
    min_nodes: 3
    max_nodes: 10
    autoscaling: enabled
    labels:
      workload: general
      
  - name: compute
    instance_type: c5.4xlarge  # 16 vCPU, 32GB RAM
    min_nodes: 2
    max_nodes: 6
    autoscaling: enabled
    labels:
      workload: compute-intensive
      
  - name: memory
    instance_type: r5.2xlarge  # 8 vCPU, 64GB RAM
    min_nodes: 2
    max_nodes: 4
    autoscaling: enabled
    labels:
      workload: memory-intensive
      
  - name: elasticsearch
    instance_type: m5.2xlarge  # 8 vCPU, 32GB RAM (optimized)
    min_nodes: 3
    max_nodes: 3
    autoscaling: disabled  # Fixed size for ES stability
    labels:
      workload: elasticsearch
      
  - name: database
    instance_type: c5.2xlarge
    min_nodes: 1
    max_nodes: 1
    autoscaling: disabled
    labels:
      workload: database

namespaces:
  - name: soc-platform
    resource_quotas:
      requests.cpu: "40"
      requests.memory: "80Gi"
      limits.cpu: "100"
      limits.memory: "200Gi"
      
  - name: monitoring
    resource_quotas:
      requests.cpu: "10"
      requests.memory: "20Gi"
      
  - name: security-tools
    resource_quotas:
      requests.cpu: "30"
      requests.memory: "60Gi"

storage:
  class: premium-ssd
  provisions:
    - name: postgres-pvc
      size: 500Gi
      type: block
      
    - name: elasticsearch-pvc
      size: 2Ti
      type: block
      
    - name: backup-pvc
      size: 5Ti
      type: nfs
      retention_policy: retain
      
    - name: arkime-pcap
      size: 10Ti
      type: block
      retention: 14 days
```

### Network Architecture

```
NETWORK ARCHITECTURE:
======================

                    ┌─────────────────────────────────┐
                    │         INTERNET               │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │      CDN / DDoS Protection      │
                    │      (Cloudflare)               │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │       EDGE / DMZ                │
                    │                                   │
                    │  ┌─────────┐  ┌─────────┐        │
                    │  │ Caddy   │  │ Bastion │        │
                    │  │ Reverse │  │ Host    │        │
                    │  │ Proxy   │  │ (SSH)   │        │
                    │  └────┬────┘  └─────────┘        │
                    └───────┼──────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
   ┌────────▼────────┐    │    ┌──────────▼────────┐
   │   APPLICATION   │    │    │    SECURITY TOOLS   │
   │      SUBNET     │    │    │      SUBNET        │
   │  10.0.1.0/24    │    │    │  10.0.2.0/24       │
   │                 │    │    │                    │
   │  ┌───────────┐  │    │    │  ┌──────────────┐  │
   │  │ K8s Nodes │  │    │    │  │ Wazuh/Elastic │  │
   │  │ (Pods)    │  │    │    │  │ search        │  │
   │  └───────────┘  │    │    │  └──────────────┘  │
   │                 │    │    │  ┌──────────────┐  │
   │  ┌───────────┐  │    │    │  │ Suricata/Zeek │  │
   │  │ Postgres  │  │    │    │  │ Arkime        │  │
   │  │ (Primary) │  │    │    │  └──────────────┘  │
   │  └───────────┘  │    │    │                    │
   │                 │    │    │  ┌──────────────┐  │
   │  ┌───────────┐  │    │    │  │ TheHive/Cortex│  │
   │  │ Redis     │  │    │    │  │ GRR           │  │
   │  │ Cache     │  │    │    │  └──────────────┘  │
   │  └───────────┘  │    │    │                    │
   └─────────────────┘    │    └────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │               │              │
   ┌────────▼────────┐    │    ┌──────────▼────────┐
   │   DATABASE      │    │    │   BACKUP / DR     │
   │   SUBNET       │    │    │   SUBNET          │
   │  10.0.3.0/24   │    │    │  10.0.4.0/24      │
   │                 │    │    │                    │
   │  ┌───────────┐  │    │    │  ┌──────────────┐  │
   │  │Postgres   │  │    │    │  │ Backup        │  │
   │  │(Replica)  │  │    │    │  │ Storage       │  │
   │  └───────────┘  │    │    │  └──────────────┘  │
   │                 │    │    │  ┌──────────────┐  │
   │  ┌───────────┐  │    │    │  │ DR Site       │  │
   │  │Vault      │  │    │    │  │ (Oran)        │  │
   │  │Secrets    │  │    │    │  └──────────────┘  │
   │  └───────────┘  │    │    │                    │
   └─────────────────┘    │    └────────────────────┘
                           │
                    ┌──────┴──────────────────────────┐
                    │      INTERNAL NETWORK            │
                    │      (Corporate/Datacenter)      │
                    │      10.0.0.0/16                 │
                    └─────────────────────────────────┘
```

---

## Security Architecture

### Defense in Depth Layers

```
SECURITY ARCHITECTURE LAYERS:
============================

LAYER 1: PERIMETER SECURITY
├── DDoS Protection (Cloudflare)
├── Web Application Firewall rules
├── Network edge filtering
└── Geographic IP blocking (where appropriate)

LAYER 2: NETWORK SECURITY
├── Network segmentation (VLANs/subnets)
├── East-west traffic inspection
├── Micro-segmentation (Kubernetes NetworkPolicies)
└── Encrypted transit (TLS 1.3)

LAYER 3: HOST SECURITY
├── Hardened container images
├── Runtime security (seccomp/AppArmor)
├── Pod Security Standards (restricted)
└── Host-level IDS/endpoint protection

LAYER 4: APPLICATION SECURITY
├── Authentication (MFA, SSO)
├── Authorization (RBAC)
├── Input validation/sanitization
├── Secure session management
└── API rate limiting

LAYER 5: DATA SECURITY
├── Encryption at rest (AES-256)
├── Encryption in transit (TLS 1.3)
├── Data classification enforcement
├── Access logging and auditing
└── Data loss prevention controls

LAYER 6: MONITORING & RESPONSE
├── SIEM correlation and alerting
├── EDR telemetry collection
├── User behavior analytics
└── Automated incident response playbooks
```

### Identity and Access Management

```
IAM ARCHITECTURE:
==================

┌─────────────────────────────────────────────────────────────┐
│                     IDENTITY PROVIDERS                      │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   LDAP/AD   │  │    SAML     │  │   OAuth2    │       │
│  │ (Primary)   │  │  (SSO)      │  │  (API)      │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                │                │               │
│         └────────────────┼────────────────┘               │
│                          ▼                                 │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              AUTHENTICATION SERVICE                  │  │
│  │                                                     │  │
│  │  • Credential validation                            │  │
│  │  • MFA enforcement                                  │  │
│  │  • Session management                               │  │
│  │  • Token issuance (JWT)                             │  │
│  └──────────────────────────┬──────────────────────────┘  │
│                             │                             │
│                             ▼                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              AUTHORIZATION SERVICE                   │  │
│  │                                                     │  │
│  │  RBAC MODEL:                                        │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │ Role: admin                                 │   │  │
│  │  │ Permissions: *.* (full access)              │   │  │
│  │  ├─────────────────────────────────────────────┤   │  │
│  │  │ Role: analyst                               │   │  │
│  │  │ Permissions: alerts.*, incidents.*, reports.read│  │
│  │  ├─────────────────────────────────────────────┤   │  │
│  │  │ Role: viewer                                │   │  │
│  │  │ Permissions: *.read only                     │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Architecture

### External Integrations

| System | Integration Type | Protocol | Purpose |
|--------|-----------------|----------|---------|
| **ANRT Gateway** | REST API | HTTPS | Regulatory reporting |
| **National CSIRT** | TRUST/TAXII | Push/Pull | Threat sharing |
| **Law Enforcement** | Secure Portal | HTTPS | Legal requests |
| **Billing System** | Database Link | Internal | Fraud correlation |
| **CRM System** | REST API | HTTPS | Customer context |
| **HR System** | LDAP Sync | LDAPS | Employee data |
| **Email Gateway** | SMTP/API | SMTP/TLS | Notifications |
| **SMS Gateway** | REST API | HTTPS | Alert notifications |
| **PagerDuty** | REST API | HTTPS | On-call escalation |

### Internal Tool Integration Matrix

```
INTEGRATION MATRIX:
==================

                    WAZUH  ELASTIC  THEHIVE  CORTEX  MISP   OPENCTI
                    ──────  ───────  ──────  ──────  ────   ──────
WAZUH               ●       ●       ○       ○      ○       ○
  (SIEM)            Native  Index   Case    Analyze IOC    IOC
Elasticsearch        ●       ●       ○       ○      ○       ○
  (Search)           Index   Native  Search  Search  Search  Search
TheHive              ○       ○       ●       ●      ●       ●
  (Case Mgmt)        Alert   Search  Native  Analyze IOC    IOC
Cortex              ○       ○       ●       ●      ○       ○
  (Analysis)         Analyze Analyze Analyze Native  N/A    N/A
MISP                ○       ○       ●       ●      ●       ●
  (TI Basic)         IOC     Search  Case    Analyze Native Sync
OpenCTI             ○       ○       ●       ○      ●       ●
  (TI Advanced)      IOC     Search  Case    N/A    Sync   Native
Suricata            ●       ●       ○       ○      ○       ○
  (IDS)              Alert   Alert   Case    N/A    IOC    IOC
Zeek                ●       ●       ○       ○      ○       ○
  (NSM)              Log     Log     Case    N/A    N/A    N/A
GRR                 ○       ○       ●       ○      ○       ○
  (IR)               Alert   N/A     Case    N/A    N/A    N/A

Legend:
● = Direct integration
○ = Indirect/manual integration possible
N/A = Not applicable
```

---

## Technology Decisions and Rationale

### Key Technology Choices

| Decision | Choice | Alternatives Considered | Rationale |
|----------|-------|------------------------|-----------|
| **Framework** | Next.js (React) | Vue.js, Angular | Best SSR support, strong ecosystem |
| **Language** | TypeScript | Python, Go | Type safety, team expertise, full-stack |
| **Database** | PostgreSQL | MongoDB, MySQL | ACID compliance, JSON support, telecom-friendly |
| **Search** | Elasticsearch | Splunk, ClickHouse | Open source, scalable, rich query language |
| **SIEM** | Wazuh | Splunk QRadar, Sentinel | Cost-effective, open source, agent-based |
| **Case Mgmt** | TheHive | ServiceNow IR, PhishMe | Purpose-built for SOC, open source |
| **Container** | Kubernetes | Docker Swarm, Nomad | Industry standard, ecosystem maturity |
| **Secrets** | HashiCorp Vault | AWS Secrets Manager, Kubernetes Secrets | Multi-cloud, dynamic secrets, audit |
| **Queue** | Kafka | RabbitMQ, AWS SQS | Throughput, durability, replay capability |
| **Cache** | Redis | Memcached | Data structures, persistence options |

### Why Open Source?

```
OPEN SOURCE STRATEGY RATIONALE:
==============================

COST SAVINGS
-------------
• License costs: $0 vs $500K+/year for commercial equivalents
• No vendor lock-in
• Community support reduces operational burden

CUSTOMIZATION
--------------
• Telecom-specific modifications needed
• Integration flexibility
• Algorithm transparency (important for trust)

TALENT AVAILABILITY
-------------------
• Larger hiring pool
• Familiar technologies attract engineers
• Lower training costs

COMPLIANCE FLEXIBILITY
----------------------
• Can modify for ANRT requirements
• No opaque "black box" concerns
• Auditability of code

COMMUNITY BENEFITS
-------------------
• Shared threat detection rules
• Global threat intelligence
• Collaborative improvement

TRADE-OFFS ACKNOWLEDGED
-----------------------
• Requires more internal expertise
• Support is community-dependent (mitigated by vendors)
• Integration effort higher initially
```

### Future Roadmap Considerations

| Area | Current State | Future Direction |
|------|---------------|-------------------|
| **Cloud/Hybrid** | On-premise only | Evaluate hybrid for burst capacity |
| **AI/ML** | Basic anomaly detection | Advanced predictive analytics |
| **XDR** | Point solutions | Unified XDR platform |
| **Zero Trust** | Perimeter-focused | Zero Trust architecture |
| **Automation** | Semi-automated SOAR | Fully autonomous response |
| **Threat Hunting** | Manual-heavy | Assisted hunting with AI |

---

## Appendix: Architecture Decision Records

### ADR-001: Choose Next.js over Pure React

**Date:** 2024-03-15  
**Status:** Accepted  
**Context:** Need frontend framework for SOC dashboard

**Decision:** Use Next.js with App Router

**Consequences:**
- Positive: Server-side rendering improves initial load
- Positive: Built-in API routes simplify backend
- Positive: Strong TypeScript support
- Negative: Learning curve for App Router
- Negative: Some React libraries need adaptation

### ADR-002: PostgreSQL as Primary Database

**Date:** 2024-03-20  
**Status:** Accepted  
**Context:** Choose primary data store

**Decision:** PostgreSQL with Prisma ORM

**Consequences:**
- Positive: ACID compliance for transactional data
- Positive: JSONB for flexible schema needs
- Positive: Excellent replication options (Patroni)
- Negative: Complex queries may need optimization
- Negative: Large JSON documents can impact performance

### ADR-003: Kafka for Event Streaming

**Date:** 2024-04-01  
**Status:** Accepted  
**Context:** Event ingestion and processing architecture

**Decision:** Apache Kafka with managed Zookeeper

**Consequences:**
- Positive: Handles high throughput (500M+ events/day)
- Positive: Durable replay capability
- Positive: Mature ecosystem and tooling
- Negative: Operational complexity
- Negative: Resource requirements (ZooKeeper)

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-06-01 | Architecture Team | Initial documentation |
| 2.0 | 2025-01-15 | Chief Architect | Comprehensive update, added diagrams |

---

*This document describes the technical architecture of the Djezzy National SOC Platform. For implementation details, refer to the specific component documentation.*
