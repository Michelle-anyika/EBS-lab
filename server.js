const express = require('express');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const app = express();
const port = process.env.PORT || 3000;
const version = process.env.APP_VERSION || require('./package.json').version || '1.0.0';
const bucketName = process.env.S3_BUCKET_NAME;
const awsRegion = process.env.AWS_REGION || 'us-east-1';
const externalService = process.env.EXTERNAL_SERVICE || 'none';

async function getS3Status() {
  if (!bucketName) {
    return {
      enabled: false,
      message: 'S3_BUCKET_NAME environment variable is not configured.',
    };
  }

  const client = new S3Client({ region: awsRegion });

  try {
    const command = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 5 });
    const result = await client.send(command);
    const keys = (result.Contents || []).map((item) => item.Key);
    return {
      enabled: true,
      bucket: bucketName,
      region: awsRegion,
      objectCount: result.KeyCount || 0,
      sampleKeys: keys,
    };
  } catch (error) {
    return {
      enabled: true,
      bucket: bucketName,
      region: awsRegion,
      error: error.message || String(error),
    };
  }
}

app.get('/', async (req, res) => {
  const s3Status = await getS3Status();
  res.json({
    status: 'ok',
    message: 'Elastic Beanstalk deployment successful',
    version,
    environment: process.env.NODE_ENV || 'production',
    externalService,
    s3: s3Status,
    requestHost: req.headers.host,
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version, uptimeSeconds: process.uptime() });
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
