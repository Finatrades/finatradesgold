# Finatrades AWS Deployment Guide

This guide provides step-by-step instructions for deploying the Finatrades platform to AWS.

---

## Prerequisites

Before starting, ensure you have:
- An AWS account with billing enabled
- AWS CLI installed and configured
- Git repository (GitHub, GitLab, or Bitbucket)
- Node.js 18+ installed locally

---

## Option 1: AWS Amplify (Recommended)

AWS Amplify provides the fastest path to production with automatic CI/CD.

### Step 1: Push Code to Git Repository

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Prepare for AWS deployment"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/finatrades.git
git push -u origin main
```

### Step 2: Create Amazon RDS PostgreSQL Database

1. Go to [Amazon RDS Console](https://console.aws.amazon.com/rds/)
2. Click **Create database**
3. Select:
   - Engine: PostgreSQL
   - Version: 15.x or later
   - Template: Free tier (for testing) or Production
   - DB instance identifier: `finatrades-db`
   - Master username: `finatrades_admin`
   - Master password: (create a strong password)
4. Instance configuration:
   - db.t3.micro (free tier) or db.t3.small (production)
5. Storage: 20 GB (can auto-scale)
6. Connectivity:
   - VPC: Default VPC
   - Public access: Yes (for initial setup, can restrict later)
   - Security group: Create new
7. Click **Create database**
8. Wait for database to be available (~5-10 minutes)
9. Note the **Endpoint** (e.g., `finatrades-db.xxxxx.us-east-1.rds.amazonaws.com`)

### Step 3: Configure Security Group for Database

1. In RDS console, click on your database
2. Under **Connectivity & security**, click the security group
3. Edit inbound rules:
   - Type: PostgreSQL
   - Port: 5432
   - Source: Anywhere (0.0.0.0/0) for Amplify access
   - Or restrict to Amplify's IP ranges for production

### Step 4: Create Database and Run Migrations

Connect to your RDS database and create the initial database:

```bash
# Install psql client if needed
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql-client

# Connect to RDS
psql -h finatrades-db.xxxxx.us-east-1.rds.amazonaws.com -U finatrades_admin -d postgres

# Create the database
CREATE DATABASE finatrades;
\q
```

### Step 5: Deploy with AWS Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **New app** → **Host web app**
3. Choose your Git provider and authorize
4. Select your repository and branch
5. Configure build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist/public
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*

backend:
  phases:
    build:
      commands:
        - npm ci
        - npm run build
```

6. Add environment variables (click **Advanced settings**):

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://finatrades_admin:PASSWORD@finatrades-db.xxxxx.us-east-1.rds.amazonaws.com:5432/finatrades` |
| `SESSION_SECRET` | (generate a random 64-character string) |
| `NODE_ENV` | `production` |
| `OPENAI_API_KEY` | (your OpenAI API key) |
| `BINANCE_PAY_API_KEY` | (your Binance Pay key) |
| `BINANCE_PAY_SECRET_KEY` | (your Binance Pay secret) |
| `BINANCE_PAY_MERCHANT_ID` | (your Binance merchant ID) |

7. Click **Save and deploy**

### Step 6: Run Database Migrations

After deployment, run migrations via Amplify console or locally:

```bash
# Set DATABASE_URL to production RDS
export DATABASE_URL="postgresql://finatrades_admin:PASSWORD@finatrades-db.xxxxx.us-east-1.rds.amazonaws.com:5432/finatrades"

# Run migrations
npm run db:push
```

### Step 7: Configure Custom Domain (Optional)

1. In Amplify console, go to **Domain management**
2. Click **Add domain**
3. Enter your domain (e.g., `finatrades.com`)
4. Follow DNS configuration instructions
5. SSL certificate is automatically provisioned

---

## Option 2: AWS Elastic Beanstalk

Elastic Beanstalk provides more control and is ideal for full-stack applications.

### Step 1: Install EB CLI

```bash
# macOS
brew install awsebcli

# pip (all platforms)
pip install awsebcli

# Verify installation
eb --version
```

### Step 2: Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1 (or your preferred region)
# Default output format: json
```

### Step 3: Create RDS Database

Follow the same RDS setup as Option 1 (Steps 2-4).

### Step 4: Prepare Application

Create `.ebextensions/nodecommand.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    NPM_USE_PRODUCTION: false
```

Create `.ebextensions/env.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
```

Create `Procfile`:

```
web: npm start
```

### Step 5: Initialize and Deploy

```bash
# Initialize Elastic Beanstalk application
eb init

# Answer prompts:
# - Select region (us-east-1 recommended)
# - Application name: finatrades
# - Platform: Node.js 18
# - Set up SSH: Yes (optional)

# Create environment
eb create finatrades-production --database.engine postgres

# Or create without database if using external RDS
eb create finatrades-production
```

### Step 6: Configure Environment Variables

```bash
eb setenv \
  DATABASE_URL="postgresql://finatrades_admin:PASSWORD@finatrades-db.xxxxx.us-east-1.rds.amazonaws.com:5432/finatrades" \
  SESSION_SECRET="your-secret-key" \
  NODE_ENV="production" \
  OPENAI_API_KEY="your-openai-key"
```

### Step 7: Deploy Updates

```bash
# Deploy changes
eb deploy

# View logs
eb logs

# Open application in browser
eb open

# SSH into instance (if needed)
eb ssh
```

### Step 8: Configure Custom Domain

1. Go to Route 53 or your DNS provider
2. Create CNAME record pointing to your EB environment URL
3. Configure SSL in EB console under **Configuration** → **Load balancer**

---

## Database Migration from Replit

### Export Data from Replit PostgreSQL

```bash
# In Replit shell, export your database
pg_dump $DATABASE_URL > finatrades_backup.sql

# Download the file from Replit
```

### Import Data to AWS RDS

```bash
# Import to RDS
psql -h finatrades-db.xxxxx.us-east-1.rds.amazonaws.com \
     -U finatrades_admin \
     -d finatrades \
     -f finatrades_backup.sql
```

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Random string for session encryption | Yes |
| `NODE_ENV` | Set to `production` | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI features | If using AI |
| `BINANCE_PAY_API_KEY` | Binance Pay API key | If using Binance |
| `BINANCE_PAY_SECRET_KEY` | Binance Pay secret | If using Binance |
| `BINANCE_PAY_MERCHANT_ID` | Binance merchant ID | If using Binance |
| `SMTP_HOST` | Email server host | For emails |
| `SMTP_PORT` | Email server port | For emails |
| `SMTP_USER` | Email username | For emails |
| `SMTP_PASS` | Email password | For emails |

---

## Post-Deployment Checklist

- [ ] Database is accessible from AWS
- [ ] All environment variables are set
- [ ] Database migrations have run successfully
- [ ] Application loads without errors
- [ ] User authentication works
- [ ] Payment integrations (Binance Pay) work
- [ ] Email notifications work
- [ ] Real-time features (Socket.IO) work
- [ ] SSL certificate is active
- [ ] Custom domain is configured (if applicable)

---

## Troubleshooting

### Application Won't Start

Check logs:
```bash
# Amplify: Check build logs in console
# Elastic Beanstalk:
eb logs
```

### Database Connection Errors

1. Verify `DATABASE_URL` is correct
2. Check RDS security group allows inbound traffic on port 5432
3. Ensure database is publicly accessible (or in same VPC)

### Build Failures

1. Check Node.js version matches (18+)
2. Verify all dependencies are in `package.json`
3. Run `npm ci && npm run build` locally to test

### SSL/HTTPS Issues

1. Amplify: SSL is automatic
2. Elastic Beanstalk: Configure in Load Balancer settings, request certificate from ACM

---

## Cost Estimates

| Service | Free Tier | Production |
|---------|-----------|------------|
| **Amplify Hosting** | 1,000 build mins/mo | ~$10-30/mo |
| **RDS PostgreSQL** | 750 hrs db.t3.micro | ~$15-50/mo |
| **Elastic Beanstalk** | 750 hrs t3.micro | ~$20-60/mo |
| **Data Transfer** | 100 GB/mo | $0.09/GB after |

**Estimated monthly total:** $30-100 depending on traffic and instance sizes.

---

## Support

For AWS-specific issues:
- [AWS Support](https://aws.amazon.com/support/)
- [AWS Documentation](https://docs.aws.amazon.com/)

For Finatrades application issues:
- Contact: System@finatrades.com
- Author: Charan Pratap Singh (+971568474843)
