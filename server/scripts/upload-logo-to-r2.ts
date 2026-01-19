import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

async function uploadLogo() {
  const logoPath = path.join(process.cwd(), 'client/public/finatrades-logo-purple.png');
  
  if (!fs.existsSync(logoPath)) {
    console.error('Logo file not found:', logoPath);
    process.exit(1);
  }
  
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  
  const fileBuffer = fs.readFileSync(logoPath);
  const key = 'branding/finatrades-logo-purple.png';
  
  console.log('Uploading logo to R2 storage...');
  
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: 'image/png',
    }));
    
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log('Logo uploaded successfully!');
    console.log('URL:', publicUrl);
    process.exit(0);
  } catch (error) {
    console.error('Failed to upload logo:', error);
    process.exit(1);
  }
}

uploadLogo();
