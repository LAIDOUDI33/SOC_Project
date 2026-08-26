# =============================================================================
# Terraform - Compute Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# SSH Key Pair
# -----------------------------------------------------------------------------

resource "aws_key_pair" "deploy" {
  key_name   = "${local.name_prefix}-deploy"
  public_key = tls_private_key.ssh.public_key_openssh

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Security Group for SOC Platform
# -----------------------------------------------------------------------------

resource "aws_security_group" "soc_platform" {
  name        = "${local.name_prefix}-sg"
  description = "Security group for National SOC Platform"
  vpc_id      = aws_vpc.main.id

  # SSH access (restrict in production!)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
    description = "SSH access"
  }

  # HTTP/HTTPS
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  # Wazuh ports
  ingress {
    from_port   = 1514
    to_port     = 1515
    protocol    = "tcp"
    cidr_blocks = var.allowed_api_cidrs
    description = "Wazuh Manager"
  }

  ingress {
    from_port   = 1514
    to_port     = 1514
    protocol    = "udp"
    cidr_blocks = var.allowed_api_cidrs
    description = "Wazuh Events UDP"
  }

  ingress {
    from_port   = 55000
    to_port     = 55000
    protocol    = "tcp"
    cidr_blocks = var.allowed_api_cidrs
    description = "Wazuh API"
  }

  # Monitoring ports (internal only)
  ingress {
    from_port   = 3000
    to_port     = 9100
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Monitoring stack"
  }

  # Database ports (internal only)
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "PostgreSQL"
  }

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Redis"
  }

  ingress {
    from_port   = 9200
    to_port     = 9300
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Elasticsearch"
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-sg"
  })
}

# -----------------------------------------------------------------------------
# IAM Role for EC2 Instance
# -----------------------------------------------------------------------------

resource "aws_iam_role" "soc_instance" {
  name = "${local.name_prefix}-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.soc_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "s3_readonly" {
  role       = aws_iam_role.soc_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

resource "aws_iam_instance_profile" "soc_platform" {
  name = "${local.name_prefix}-instance-profile"
  role = aws_iam_role.soc_instance.name
}

# -----------------------------------------------------------------------------
# EC2 Instance Profile / Launch Template
# -----------------------------------------------------------------------------

resource "aws_launch_template" "soc_platform" {
  name          = "${local.name_prefix}-lt"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.deploy.key_name

  iam_instance_profile = aws_iam_instance_profile.soc_platform.name

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.soc_platform.id]
    delete_on_termination       = true
  }

  block_device_mappings {
    device_name = "/dev/sda1"

    ebs {
      volume_size           = var.root_volume_size
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = false
    }
  }

  block_device_mappings {
    device_name = "/dev/sdb"

    ebs {
      volume_size           = var.data_volume_size
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 250
      encrypted             = true
      delete_on_termination = false
    }
  }

  user_data = base64(file("${path.module}/templates/user-data.sh"))

  monitoring = true

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(local.common_tags, {
      Name = "${local.name_prefix}-instance"
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags = local.common_tags
  }
}

# -----------------------------------------------------------------------------
# Auto Scaling Group
# -----------------------------------------------------------------------------

resource "aws_autoscaling_group" "soc_platform" {
  name                = "${local.name_prefix}-asg"
  desired_capacity    = var.desired_capacity
  max_size            = var.max_size
  min_size            = var.min_size

  launch_template {
    id      = aws_launch_template.soc_platform.id
    version = "$Latest"
  }

  vpc_zone_identifier = aws_subnet.private[*].id

  health_check_type         = "EC2"
  health_check_grace_period = 300

  target_group_arns = []

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  dynamic "tag" {
    for_each = local.common_tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes = [load_balancers, target_group_arns]
  }
}

# -----------------------------------------------------------------------------
# Outputs (for use by other resources)
# -----------------------------------------------------------------------------

output "public_ip" {
  value = try(aws_autoscaling_group.soc_platform[0].instances[0].public_ip, "")
}

output "private_ip" {
  value = try(aws_autoscaling_group.soc_platform[0].instances[0].private_ip, "")
}
