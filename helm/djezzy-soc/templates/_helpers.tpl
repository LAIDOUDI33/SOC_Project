{{/*
=============================================================================
Djezzy National SOC Platform - Template Helpers
=============================================================================
Generic template helpers for consistent resource generation
ANRT Compliant | Production Ready
=============================================================================
*/}}

{{/*
Generate common labels
*/}}
{{- define "djezzy-soc.labels" -}}
helm.sh/chart: {{ include "djezzy-soc.chart" . }}
{{ include "djezzy-soc.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
anrt.djezzy.soc/compliance: telecom-regulation
{{- end }}

{{/*
Selector labels
*/}}
{{- define "djezzy-soc.selectorLabels" -}}
app.kubernetes.io/name: djezzy-soc
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Chart name as app name
*/}}
{{- define "djezzy-soc.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label
*/}}
{{- define "djezzy-soc.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Full name of the chart (including release name)
*/}}
{{- define "djezzy-soc.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Namespace helper
*/}}
{{- define "djezzy-soc.namespace" -}}
{{- if .Values.namespaceOverride }}
{{- .Values.namespaceOverride }}
{{- else }}
{{- .Release.Namespace }}
{{- end }}
{{- end }}

{{/*
Image helper
*/}}
{{- define "djezzy-soc.image" -}}
{{- $registry := .Values.global.imageRegistry | default "" }}
{{- $repository := .Values.image.repository }}
{{- $tag := .Values.image.tag | default .Chart.AppVersion }}
{{- if $registry }}
{{- printf "%s/%s:%s" $registry $repository $tag }}
{{- else }}
{{- printf "%s:%s" $repository $tag }}
{{- end }}
{{- end }}

{{/*
Common annotations for ArgoCD/GitOps compatibility
*/}}
{{- define "djezzy-soc.annotations" -}}
argocd.argoproj.io/sync-wave: "{{ .Values.syncWave | default "2" }}"
helm.sh/hook-weight: "{{ .Values.hookWeight | default "0" }}"
description: "{{ .Values.description | default (printf "Djezzy SOC Platform - %s" (.Values.componentName | default "component")) }}"
{{- with .Values.extraAnnotations }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Security context for containers (NSA K8s Hardening Guide compliant)
*/}}
{{- define "djezzy-soc.securityContext" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: {{ .Values.securityContext.readOnlyRootFilesystem | default true }}
capabilities:
  drop:
  - ALL
seccompProfile:
  type: RuntimeDefault
runAsNonRoot: true
runAsUser: {{ .Values.securityContext.runAsUser | default 1000 }}
runAsGroup: {{ .Values.securityContext.runAsGroup | default 1000 }}
fsGroup: {{ .Values.securityContext.fsGroup | default 1000 }}
{{- end }}

{{/*
Pod security context
*/}}
{{- define "djezzy-soc.podSecurityContext" -}}
runAsNonRoot: {{ .Values.podSecurityContext.runAsNonRoot | default true }}
runAsUser: {{ .Values.podSecurityContext.runAsUser | default 1000 }}
runAsGroup: {{ .Values.podSecurityContext.runAsGroup | default 1000 }}
fsGroup: {{ .Values.podSecurityContext.fsGroup | default 1000 }}
seccompProfile:
  type: RuntimeDefault
{{- end }}

{{/*
Affinity rules including pod anti-affinity
*/}}
{{- define "djezzy-soc.affinity" -}}
{{- if .Values.affinity }}
{{ toYaml .Values.affinity }}
{{- else }}
podAntiAffinity:
  preferredDuringSchedulingIgnoredDuringExecution:
  - weight: 100
    podAffinityTerm:
      labelSelector:
        matchLabels:
          {{- include "djezzy-soc.selectorLabels" . | nindent 10 }}
          app.kubernetes.io/component: {{ .Values.componentName }}
      topologyKey: kubernetes.io/hostname
{{- end }}
{{- end }}

{{/*
Liveness probe configuration
*/}}
{{- define "djezzy-soc.livenessProbe" -}}
httpGet:
  path: {{ .Values.livenessProbe.path | default "/health" }}
  port: {{ .Values.livenessProbe.port | default "http" }}
initialDelaySeconds: {{ .Values.livenessProbe.initialDelaySeconds | default 30 }}
periodSeconds: {{ .Values.livenessProbe.periodSeconds | default 10 }}
timeoutSeconds: {{ .Values.livenessProbe.timeoutSeconds | default 5 }}
failureThreshold: {{ .Values.livenessProbe.failureThreshold | default 3 }}
{{- end }}

{{/*
Readiness probe configuration
*/}}
{{- define "djezzy-soc.readinessProbe" -}}
httpGet:
  path: {{ .Values.readinessProbe.path | default "/health/readiness" }}
  port: {{ .Values.readinessProbe.port | default "http" }}
initialDelaySeconds: {{ .Values.readinessProbe.initialDelaySeconds | default 5 }}
periodSeconds: {{ .Values.readinessProbe.periodSeconds | default 5 }}
timeoutSeconds: {{ .Values.readinessProbe.timeoutSeconds | default 3 }}
failureThreshold: {{ .Values.readinessProbe.failureThreshold | default 3 }}
{{- end }}

{{/*
Startup probe configuration
*/}}
{{- define "djezzy-soc.startupProbe" -}}
httpGet:
  path: {{ .Values.startupProbe.path | default "/health" }}
  port: {{ .Values.startupProbe.port | default "http" }}
initialDelaySeconds: {{ .Values.startupProbe.initialDelaySeconds | default 10 }}
periodSeconds: {{ .Values.startupProbe.periodSeconds | default 5 }}
timeoutSeconds: {{ .Values.startupProbe.timeoutSeconds | default 3 }}
failureThreshold: {{ .Values.startupProbe.failureThreshold | default 30 }}
{{- end }}

{{/*
Resource helper
*/}}
{{- define "djezzy-soc.resources" -}}
requests:
  cpu: {{ .Values.resources.requests.cpu | default "100m" }}
  memory: {{ .Values.resources.requests.memory | default "128Mi" }}
limits:
  cpu: {{ .Values.resources.limits.cpu | default "500m" }}
  memory: {{ .Values.resources.limits.memory | default "256Mi" }}
{{- end }}

{{/*
Service account name
*/}}
{{- define "djezzy-soc.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- include "djezzy-soc.fullname" . }}-service-account
{{- else }}
{{- .Values.serviceAccount.name | default "default" }}
{{- end }}
{{- end }}

{{/*
Prometheus scrape annotation
*/}}
{{- define "djezzy-soc.prometheusAnnotations" -}}
prometheus.io/scrape: "true"
prometheus.io/port: "{{ .Values.service.port | default "8080" }}"
prometheus.io/path: "{{ .Values.prometheusPath | default "/metrics" }}"
{{- end }}

{{/*
ConfigMap name helper
*/}}
{{- define "djezzy-soc.configmapName" -}}
{{- if .Values.configMap.existingConfigMap }}
{{- .Values.configMap.existingConfigMap }}
{{- else }}
{{- include "djezzy-soc.fullname" . }}-config
{{- end }}
{{- end }}

{{/*
Secret name helper
*/}}
{{- define "djezzy-soc.secretName" -}}
{{- if .Values.secrets.existingSecret }}
{{- .Values.secrets.existingSecret }}
{{- else }}
{{- include "djezzy-soc.fullname" . }}-secrets
{{- end }}
{{- end }}

{{/*
PVC name helper
*/}}
{{- define "djezzy-soc.pvcName" -}}
{{- include "djezzy-soc.fullname" . }}-data
{{- end }}

{{/*
Environment variables from ConfigMap
*/}}
{{- define "djezzy-soc.envFromConfigMap" -}}
- configMapRef:
    name: {{ include "djezzy-soc.configmapName" . }}
{{- end }}

{{/*
Environment variables from Secret
*/}}
{{- define "djezzy-soc.envFromSecret" -}}
- secretRef:
    name: {{ include "djezzy-soc.secretName" . }}
{{- end }}

{{/*
Volume mount for data persistence
*/}}
{{- define "djezzy-soc.volumeMounts" -}}
{{- if .Values.persistence.enabled }}
- name: data
  mountPath: {{ .Values.persistence.mountPath | default "/data" }}
{{- end }}
{{- with .Values.extraVolumeMounts }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Volume definition for data persistence
*/}}
{{- define "djezzy-soc.volumes" -}}
{{- if .Values.persistence.enabled }}
- name: data
  persistentVolumeClaim:
    claimName: {{ include "djezzy-soc.pvcName" . }}
{{- end }}
{{- with .Values.extraVolumes }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Tolerations helper
*/}}
{{- define "djezzy-soc.tolerations" -}}
{{- if .Values.tolerations }}
{{ toYaml .Values.tolerations }}
{{- end }}
{{- end }}

{{/*
Node selector helper
*/}}
{{- define "djezzy-soc.nodeSelector" -}}
{{- if .Values.nodeSelector }}
{{ toYaml .Values.nodeSelector }}
{{- end }}
{{- end }}

{{/*
Topology spread constraints for high availability
*/}}
{{- define "djezzy-soc.topologySpreadConstraints" -}}
{{- if .Values.topologySpreadConstraints }}
topologySpreadConstraints:
{{ toYaml .Values.topologySpreadConstraints }}
{{- else if .Values.replicas | default 1 | gt 1 }}
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: kubernetes.io/zone
  whenUnsatisfiable: ScheduleAnyway
  labelSelector:
    matchLabels:
      {{- include "djezzy-soc.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: {{ .Values.componentName }}
- maxSkew: 1
  topologyKey: kubernetes.io/hostname
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      {{- include "djezzy-soc.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: {{ .Values.componentName }}
{{- end }}
{{- end }}

{{/*
ANRT compliance labels
*/}}
{{- define "djezzy-soc.anrtLabels" -}}
anrt.djezzy.soc/compliance: {{ .Values.anrt.compliance | default "telecom-regulation" }}
anrt.djezzy.soc/data-retention-days: "{{ .Values.anrt.dataRetentionDays | default 2555 }}"
anrt.djezzy.soc/audit-enabled: "{{ .Values.anrt.auditLogging | default true }}"
anrt.djezzy.soc/environment: {{ .Values.global.environment | default "development" }}
{{- end }}
