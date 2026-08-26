# =============================================================================
# Terraform - Storage Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# S3 Bucket for Backups
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "backups" {
  bucket = "${local.name_prefix}-backups-${random_id.suffix.hex}"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backups"
    Purpose = "SOC-Platform-Backups"
  })
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "backup-retention"
    status = "Enabled"

    expiration {
      days = var.backup_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# S3 Bucket for Evidence/Files (MinIO)
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "evidence" {
  bucket = "${local.name_prefix}-evidence-${random_id.suffix.hex}"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-evidence"
    Purpose = "SOC-Evidence-Storage"
  })
}

resource "aws_s3_bucket_versioning" "evidence" {
  bucket = aws_s3_bucket.evidence.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id

  rule {
    id     = "evidence-retention"
    status = "Enabled"

    # Evidence files should be kept longer
    noncurrent_version_expiration {
      noncurrent_days = 365
    }

    transition {
      days          = 180
      storage_class = "STANDARD_IA"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "evidence" {
  bucket                  = aws_s3_bucket.evidence.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# EBS Volume for Database Data (if using external EBS)
# -----------------------------------------------------------------------------

resource "aws_ebs_volume" "database_data" {
  availability_zone = data.aws_availability_zones.available.names[0]
  size              = 200
  type              = "gp3"
  encrypted         = true
  final_snapshot   = false

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-data"
    Purpose = "Database-Data"
  })
}

resource "aws_ebs_volume" "elasticsearch_data" {
  availability_zone = data.aws_availability_zones.available.names[0]
  size              = 500
  type              = "gp3"
  iops              = 3000
  encrypted         = true
  final_snapshot   = false

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-es-data"
    Purpose = "Elasticsearch-Data"
  })
}

# -----------------------------------------------------------------------------
# KMS Key for Encryption
# -----------------------------------------------------------------------------

resource "aws_kms_key" "soc_platform" {
  description             = "KMS key for SOC Platform encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = local.common_tags
}

resource "aws_kms_alias" "soc_platform" {
  name          = "alias/${local.name_prefix}"
  target_key_id = aws_kms_key.soc_platform.key_id
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "backup_bucket_name" {
  value = aws_s3_bucket.backups.bucket
}

output "evidence_bucket_name" {
  value = aws_s3_bucket.evidence.bucket
}

output "ebs_volume_ids" {
  value = [
    aws_ebs_volume.database_data.id,
    aws_ebs_volume.elasticsearch_data.id
  ]
}

output "kms_key_arn" {
  value = aws_kms_key.soc_platform.arn
}
