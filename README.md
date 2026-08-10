# Elastic Beanstalk Node.js Deployment

This repository contains a sample Node.js web application deployed to AWS Elastic Beanstalk using GitHub Actions for CI/CD.

## What is included

- `server.js`: Simple Express app that returns deployment status and optional AWS S3 integration details.
- `package.json`: Node.js runtime configuration and dependencies.
- `.github/workflows/deploy.yml`: GitHub Actions workflow that packages the app, uploads it to Amazon S3, creates an Elastic Beanstalk application version, and deploys it.
- `.ebextensions/application-env.config`: Elastic Beanstalk environment configuration for external service integration.

## Setup Instructions

1. Create an S3 bucket for Elastic Beanstalk source bundles.
2. Create or reuse an Elastic Beanstalk application and environment.
3. Add the following repository secrets in GitHub:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `EB_APP_NAME`
   - `EB_ENV_NAME`
   - `S3_BUCKET`
   - `EXTERNAL_SERVICE` (optional, e.g. `s3`)
   - `S3_BUCKET_NAME` (optional, use for external service integration)

## Deployment Behavior

- On every push to `main`, GitHub Actions packages the repository into `bundle.zip`.
- The workflow uploads the source bundle to S3 and creates a new Elastic Beanstalk application version.
- If the Elastic Beanstalk environment does not exist, it will be created automatically.
- If the environment exists, it will be updated to the new version.

## Validation

- Access the application using the Elastic Beanstalk environment URL.
- The root endpoint `/` returns JSON with the current deployed version and S3 status.
- The `/health` endpoint returns a simple health check.

## Optional External Service Integration

The app supports optional S3 integration driven by environment variables:

- `EXTERNAL_SERVICE`: set to `s3`
- `S3_BUCKET_NAME`: Amazon S3 bucket name to inspect

Elastic Beanstalk environment variables can be configured in the environment console or via `.ebextensions/application-env.config`.
