# =============================================================================
# Terraform Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# Networking Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = module.networking.vpc_cidr
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.networking.private_subnet_ids
}

output "nat_gateway_public_ips" {
  description = "Public IPs of NAT Gateways"
  value       = module.networking.nat_gateway_public_ips
}

# -----------------------------------------------------------------------------
# Compute Outputs
# -----------------------------------------------------------------------------

output "instance_public_ip" {
  description = "Public IP address of the main instance"
  value       = module.compute.public_ip
}

output "instance_private_ip" {
  description = "Private IP address of the main instance"
  value       = module.compute.private_ip
}

output "asg_name" {
  description = "Name of the Auto Scaling Group"
  value       = module.compute.asg_name
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.compute.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the ALB (for alias records)"
  value       = module.compute.alb_zone_id
}

# -----------------------------------------------------------------------------
# Security Outputs
# -----------------------------------------------------------------------------

output "ssh_key_name" {
  description = "Name of the SSH key pair"
  value       = aws_key_pair.deploy.key_name
}

output "security_group_id" {
  description = "ID of the main security group"
  value       = module.security_groups.soc_platform_sg_id
}

# -----------------------------------------------------------------------------
# Storage Outputs
# -----------------------------------------------------------------------------

output "s3_bucket_name" {
  description = "Name of the S3 bucket for backups and files"
  value       = module.storage.backup_bucket_name
}

output "ebs_volume_ids" {
  description = "IDs of EBS data volumes"
  value       = module.storage.ebs_volume_ids
}

# -----------------------------------------------------------------------------
# DNS Outputs
# -----------------------------------------------------------------------------

output "platform_url" {
  description = "URL to access the SOC platform"
  value       = var.route53_zone_id != "" ? "https://${var.domain_name}" : "https://${module.compute.instance_public_ip}"
}

output "wazuh_url" {
  description = "URL to Wazuh Dashboard"
  value       = var.route53_zone_id != "" ? "https://wazuh.${var.domain_name}" : "https://${module.compute.instance_public_ip}:5601"
}

output "grafana_url" {
  description = "URL to Grafana"
  value       = var.route53_zone_id != "" ? "https://grafana.${var.domain_name}" : "https://${module.compute.instance_public_ip}:3000"
}

# -----------------------------------------------------------------------------
# Connection Outputs
# -----------------------------------------------------------------------------

output "ssh_command" {
  description = "SSH command to connect to the platform"
  value       = "ssh -i ${local_file.ssh_private_key.filename} ubuntu@${module.compute.public_ip}"
}

output "connect_instructions" {
  description = "Instructions for connecting to the platform"
  value       = <<EOF

╔═══════════════════════════════════════════════════════════════╗
║              SOC Platform - Connection Details                  ║
╚═══════════════════════════════════════════════════════════════╝

SSH Connection:
  ${local_file.ssh_private_key.filename} ubuntu@${module.compute.public_ip}

Platform URLs:
  Main:        ${self.platform_url.value}
  Wazuh:       ${self.wazuh_url.value}
  Grafana:     ${self.grafana_url.value}

First-time setup:
  1. SSH into the server using the command above
  2. Run: sudo /opt/soc/scripts/init-environment.sh --non-interactive
  3. Run: sudo /opt/soc/scripts/deploy.sh start
  4. Access the platform at the URLs above

IMPORTANT:
  - Save the private key securely
  - Change default passwords after first login
  - Configure DNS records if using a custom domain

EOF
}
