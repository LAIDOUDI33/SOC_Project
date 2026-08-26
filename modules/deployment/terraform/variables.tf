# =============================================================================
# Terraform Variables
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "soc-platform"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["development", "staging", "production", "dr"], var.environment)
    error_message = "Environment must be one of: development, staging, production, dr."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "eu-west-3"  # Paris (closest to Algeria)
}

# -----------------------------------------------------------------------------
# Networking Variables
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_count" {
  description = "Number of public subnets"
  type        = number
  default     = 2
}

variable "private_subnet_count" {
  description = "Number of private subnets"
  type        = number
  default     = 3
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway for all availability zones"
  type        = bool
  default     = true
}

variable "one_nat_gateway_per_az" {
  description = "Create one NAT Gateway per AZ"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Compute Variables
# -----------------------------------------------------------------------------

variable "instance_type" {
  description = "EC2 instance type for SOC platform servers"
  type        = string
  default     = "m6i.2xlarge"  # 8 vCPUs, 32 GiB RAM

  validation {
    condition     = can(regex("^m[56]\\.[a-z]+(\\.(x?large|metal))?$", var.instance_type))
    error_message = "Instance type must be an m5 or m6 family instance."
  }
}

variable "desired_capacity" {
  description = "Desired number of instances in ASG"
  type        = number
  default     = 1
}

variable "min_size" {
  description = "Minimum number of instances in ASG"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum number of instances in ASG"
  type        = number
  default     = 3
}

variable "root_volume_size" {
  description = "Size of root EBS volume in GB"
  type        = number
  default     = 100
}

variable "data_volume_size" {
  description = "Size of data EBS volume in GB"
  type        = number
  default     = 500
}

variable "docker_compose_version" {
  description = "Docker Compose version to install"
  type        = string
  default     = "2.24.0"
}

# -----------------------------------------------------------------------------
# Security Variables
# -----------------------------------------------------------------------------

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH into instances"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict this in production!
}

variable "allowed_api_cidrs" {
  description = "CIDR blocks allowed to access API endpoints"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# -----------------------------------------------------------------------------
# DNS Variables
# -----------------------------------------------------------------------------

variable "domain_name" {
  description = "Domain name for the platform"
  type        = string
  default     = "soc.local"
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID (leave empty to skip DNS setup)"
  type        = string
  default     = ""
}

variable "create_acm_certificate" {
  description = "Create ACM certificate for domain"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Storage Variables
# -----------------------------------------------------------------------------

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

# -----------------------------------------------------------------------------
# Monitoring Variables
# -----------------------------------------------------------------------------

variable "alarm_notification_email" {
  description = "Email address for alarm notifications"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# Locals
# -----------------------------------------------------------------------------

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Country     = "DZ"
    CostCenter  = "SOC-Operations"
  }

  name_prefix = "${var.project_name}-${var.environment}"
}
