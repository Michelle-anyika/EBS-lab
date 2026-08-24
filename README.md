# Elastic Beanstalk Node.js Deployment

This repository contains a sample Node.js web application deployed to AWS Elastic Beanstalk using GitHub Actions for CI/CD.

## What is included

- `server.js`: Simple Express app that returns deployment status and S3 integration details.
- `package.json`: Node.js runtime configuration and dependencies.
- `.github/workflows/deploy.yml`: GitHub Actions workflow that packages the app, uploads it to Amazon S3, creates an Elastic Beanstalk application version, deploys it, and waits for the environment to report healthy.
- `.ebextensions/iam-instance-role.config`: Provisions a custom EC2 instance role/profile scoped to read the external S3 bucket (`S3_BUCKET_NAME`) — this is the only IAM permission the instances get beyond the standard Elastic Beanstalk web-tier policy.

`EXTERNAL_SERVICE`/`S3_BUCKET_NAME` application environment variables are owned
**exclusively** by the GitHub Actions workflow (passed via `--option-settings`
on every deploy, not just the first one). They are deliberately not set in
any `.ebextensions` file, so there is a single source of truth and a stale
value can never get silently baked back in by a redeploy.

## One-time AWS setup (before the first push)

1. Create an S3 bucket for Elastic Beanstalk source bundles.
2. Create an OIDC identity provider for GitHub Actions (skip if one already
   exists in the account):
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```
3. Create an IAM role GitHub Actions can assume, trusted only for this repo
   and the `main` branch, e.g. trust policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
       "Action": "sts:AssumeRoleWithWebIdentity",
       "Condition": {
         "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
         "StringLike": { "token.actions.githubusercontent.com:sub": "repo:Michelle-anyika/EBS-lab:ref:refs/heads/main" }
       }
     }]
   }
   ```
   Attach a permissions policy granting `elasticbeanstalk:*`, `s3:PutObject`/`s3:GetObject` on the deployment bucket, and `iam:PassRole` for `ebs-lab-instance-role` and the EB service role.
4. Ensure the default Elastic Beanstalk service role exists (one-time, only
   needed the very first time this AWS account creates an EB environment):
   ```bash
   aws iam create-service-linked-role --aws-service-name elasticbeanstalk.amazonaws.com || true
   ```
5. Add the following repository secrets in GitHub:
   - `AWS_ROLE_ARN` — the IAM role created in step 3
   - `AWS_REGION`
   - `EB_APP_NAME`
   - `EB_ENV_NAME`
   - `S3_BUCKET` — the deployment bundle bucket from step 1
   - `EXTERNAL_SERVICE` (e.g. `s3`)
   - `S3_BUCKET_NAME` (the external bucket the app reads from at runtime)

No `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` secrets are used — the
workflow authenticates with short-lived credentials via GitHub OIDC.

## Deployment Behavior

- On every push to `main`, GitHub Actions packages the repository into `bundle.zip`.
- The workflow uploads the source bundle to S3 and creates a new Elastic Beanstalk application version.
- If the Elastic Beanstalk environment does not exist, it resolves the latest
  available Node.js 18 solution stack and creates it.
- If the environment exists, it is updated to the new version.
- Either way, the workflow always re-applies `EXTERNAL_SERVICE`/`S3_BUCKET_NAME`
  from secrets, then waits (`aws elasticbeanstalk wait environment-updated`)
  and fails the job if the environment isn't `Ready`/healthy afterward.

## Validation

- Access the application using the Elastic Beanstalk environment URL.
- The root endpoint `/` returns JSON with the current deployed version and S3 status.
- The `/health` endpoint returns a simple health check.

## External Service Integration

The app connects to Amazon S3 at runtime, driven entirely by Elastic
Beanstalk environment variables (no hardcoded bucket names):

- `EXTERNAL_SERVICE`: set to `s3`
- `S3_BUCKET_NAME`: the Amazon S3 bucket the app lists objects from

The EC2 instance role (`ebs-lab-instance-role`, provisioned by
`.ebextensions/iam-instance-role.config`) is scoped to `s3:ListBucket`/`s3:GetObject`
on exactly that bucket ARN — not a wildcard — so the demo shows a real,
least-privilege integration rather than an over-permissioned default role.
