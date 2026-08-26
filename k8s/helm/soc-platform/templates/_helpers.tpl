{{/*
=============================================================================
CyberSOC Platform - Helper Templates
Standard Helm Helpers | Label Conventions | Naming
=============================================================================
*/}}
{{/*
Expand the name of the chart.
*/}}
{{- define "soc-platform.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "soc-platform.fullname" -}}
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
Create chart name and version as used by the chart label.
*/}}
{{- define "soc-platform.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "soc-platform.labels" -}}
helm.sh/chart: {{ include "soc-platform.chart" . }}
{{ include "soc-platform.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.global.complianceLabels }}
{{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "soc-platform.selectorLabels" -}}
app.kubernetes.io/name: {{ include "soc-platform.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/part-of: soc-platform
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "soc-platform.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "soc-platform.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the proper image name
*/}}
{{- define "soc-platform.image" -}}
{{- $registryName := .Values.imageRegistry | default .Values.global.imageRegistry -}}
{{- $repository := .Values.socPlatform.image.repository -}}
{{- $tag := .Values.socPlatform.image.tag | default .Chart.AppVersion | toString -}}
{{- if $registryName }}
{{- printf "%s/%s:%s" $registryName $repository $tag -}}
{{- else -}}
{{- printf "%s:%s" $repository $tag -}}
{{- end -}}
{{- end }}

{{/*
Pod Disruption Budget labels
*/}}
{{- define "soc-platform.pdbLabels" -}}
{{- include "soc-platform.labels" . | nindent 4 }}
component: pdb
{{- end }}

{{/*
Network Policy labels
*/}}
{{- define "soc-platform.networkPolicyLabels" -}}
{{- include "soc-platform.labels" . | nindent 4 }}
policy-type: network-security
{{- end }}

{{/*
Resource limits helper
*/}}
{{- define "soc-platform.resources" -}}
requests:
  cpu: {{ .Values.socPlatform.resources.requests.cpu | default "500m" }}
  memory: {{ .Values.socPlatform.resources.requests.memory | default "512Mi" }}
limits:
  cpu: {{ .Values.socPlatform.resources.limits.cpu | default "2000m" }}
  memory: {{ .Values.socPlatform.resources.limits.memory | default "2Gi" }}
{{- end }}

{{/*
Environment label for multi-cluster deployments
*/}}
{{- define "soc-platform.environment" -}}
{{- .Values.global.environment | default "staging" }}
{{- end }}

{{/*
Compliance annotation helper (ANRT/Telecom regulations)
*/}}
{{- define "soc-platform.complianceAnnotations" -}}
anrt.djezzy.soc/compliance: telecom-regulation
anrt.djezzy.soc/version: {{ .Chart.Version }}
security.djezzy.dz/classification: confidential
audit.djezzy.soc/enabled: "true"
data-residency: algeria
{{- end }}
