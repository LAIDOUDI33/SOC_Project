# =============================================================================
# National SOC Platform for Algeria (2026-2030)
# Terraform Configuration - Main Entry Point
# =============================================================================
#
# This Terraform configuration provisions cloud infrastructure for deploying
# the SOC platform on supported cloud providers (AWS, Azure, GCP).
#
# Usage:
#   terraform init
#   terraform plan -var-file=production.tfvars
#   terraform apply -var-file=production.tfvars
#
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }

  # Backend configuration for state storage
  backend "s3" {
    bucket         = "soc-platform-terraform-state"
    key            = "soc-platform/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "soc-platform-terraform-locks"
  }
}

# -----------------------------------------------------------------------------
# Provider Configuration
# -----------------------------------------------------------------------------

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "National-SOC-Platform"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Country     = "DZ"
    }
  }
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# -----------------------------------------------------------------------------
# Random Resources
# -----------------------------------------------------------------------------

resource "random_id" "suffix" {
  byte_length = 4
}

resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# -----------------------------------------------------------------------------
# Local Outputs
# -----------------------------------------------------------------------------

resource "local_file" "ssh_private_key" {
  content  = tls_private_key.ssh.private_key_pem
  filename = "${path.module}/soc-platform-${random_id.suffix.hex}.pem"
  permission = "0600"
}

# -----------------------------------------------------------------------------
# Module: VPC and Networking
# -----------------------------------------------------------------------------

module "networking" {
  source = "./modules/network"

  environment = var.environment
  project_name = var.project_name
  
  vpc_cidr           = var.vpc_cidr
  availability_zones = data.aws_availability_zones.available.names
  
  public_subnet_count  = var.public_subnet_count
  private_subnet_count = var.private_subnet_count

  enable_nat_gateway     = var.enable_nat_gateway
  single_nat_gateway     = var.single_nat_gateway
  one_nat_gateway_per_az = var.one_nat_gateway_per_az

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Module: Security Groups
# -----------------------------------------------------------------------------

module "security_groups" {
  source = "./modules/security-groups"

  vpc_id      = module.networking.vpc_id
  environment = var.environment
  project_name = var.project_name

  allowed_ssh_cidrs = var.allowed_ssh_cidrs
  allowed_api_cidrs = var.allowed_api_cidrs

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Module: IAM Roles
# -----------------------------------------------------------------------------

module "iam" {
  source = "./modules/iam"

  environment = var.environment
  project_name = var.project_name

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Module: Compute Instances
# -----------------------------------------------------------------------------

module "compute" {
  source = "./modules/compute"

  environment       = var.environment
  project_name      = var.project_name
  instance_type     = var.instance_type
  key_name          = aws_key_pair.deploy.key_name
  subnet_ids        = module.networking.private_subnet_ids
  security_group_id = module.security_groups.soc_platform_sg_id
  iam_instance_profile = module.iam.instance_profile_name

  root_volume_size  = var.root_volume_size
  data_volume_size  = var.data_volume_size

  user_data = templatefile("${path.module}/templates/user-data.tpl", {
    docker_compose_version = var.docker_compose_version
    environment            = var.environment
    ssm_parameters_prefix   = "/soc-platform/${var.environment}"
  })

  desired_capacity = var.desired_capacity
  min_size         = var.min_size
  max_size         = var.max_size

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Module: Storage
# -----------------------------------------------------------------------------

module "storage" {
  source = "./modules/storage"

  environment  = var.environment
  project_name = var.project_name

  backup_retention_days = var.backup_retention_days

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Module: DNS and Load Balancing
# -----------------------------------------------------------------------------

module "dns" {
  source = "./modules/dns"

  environment          = var.environment
  project_name         = var.project_name
  domain_name          = var.domain_name
  zone_id              = var.route53_zone_id
  alb_dns_name         = module.compute.alb_dns_name
  alb_zone_id          = module.compute.alb_zone_id
  public_ip            = module.compute.public_ip

  create_certificate   = var.create_acm_certificate

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Module: Monitoring
# -----------------------------------------------------------------------------

module "monitoring" {
  source = "./modules/monitoring"

  environment  = var.environment
  project_name = var.project_name
  vpc_id       = module.networking.vpc_id
  alarm_actions = var.alarm_notification_email

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "platform_url" {
  description = "URL to access the SOC platform"
  value       = "https://${module.dns.platform_url}"
}

output "ssh_command" {
  description = "SSH command to connect to the platform"
  value       = "ssh -i ${local_file.ssh_private_key.filename} ubuntu@${module.compute.public_ip}"
}

output "vpc_id" {
  description = "VPC ID where resources are deployed"
  value       = module.networking.vpc_id
}

output "instance_public_ip" {
  description = "Public IP of the main instance"
  value       = module.compute.public_ip
}
