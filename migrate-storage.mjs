
import { createClient } from '@supabase/supabase-js';

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const sourceUrl = required('SUPABASE_SOURCE_URL').replace(/\/+$/, '');
const sourceKey = required('SUPABASE_SOURCE_SERVICE_ROLE_KEY');
const targetUrl = required('SUPABASE_TARGET_URL').replace(/\/+$/, '');
const targetKey = required('SUPABASE_TARGET_SERVICE_ROLE_KEY');

const source = createClient(sourceUrl, sourceKey, {
  auth: { persistSession: false }
});

const target = createClient(targetUrl, targetKey, {
  auth: { persistSession: false }
});

const bucketName = 'candidate-photos';

let copied = 0;
let skipped = 0;
let failed = 0;

async function getBucketInfo(url, key, label) {
  const response = await fetch(
    `${url}/storage/v1/bucket/${encodeURIComponent(bucketName)}`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `${label}: ตรวจ bucket ไม่สำเร็จ HTTP ${response.status}: ${body}`
    );
  }

  const bucket = JSON.parse(body);

  if (bucket.name !== bucketName) {
    throw new Error(`${label}: ชื่อ bucket ที่ตอบกลับไม่ตรงกัน`);
  }

  console.log(
    `${label}: bucket=${bucket.name}, public=${bucket.public}`
  );

  return bucket;
}

async function objectExists(path) {
  const slash = path.lastIndexOf('/');
  const folder = slash >= 0 ? path.slice(0, slash) : '';
  const filename = slash >= 0 ? path.slice(slash + 1) : path;

  const { data, error } = await target.storage
    .from(bucketName)
    .list(folder, {
      search: filename,
      limit: 100
    });

  if (error) throw error;

  return (data || []).some(item => item.name === filename);
}

async function migrateObject(path, metadata) {
  try {
    if (await objectExists(path)) {
      console.log(`SKIP existing: ${path}`);
      skipped++;
      return;
    }

    const { data: file, error: downloadError } = await source.storage
      .from(bucketName)
      .download(path);

    if (downloadError) throw downloadError;
    if (!file) throw new Error('ดาวน์โหลดไฟล์ต้นทางแล้วไม่ได้ข้อมูลไฟล์');

    const contentType =
      metadata?.mimetype ||
      metadata?.contentType ||
      'application/octet-stream';

    const { error: uploadError } = await target.storage
      .from(bucketName)
      .upload(path, file, {
        contentType,
        upsert: false
      });

    if (uploadError) {
      // ถ้ามีไฟล์เดียวกันถูกสร้างระหว่างตรวจและอัปโหลด ให้ถือว่าข้าม
      if (
        /already exists|duplicate|object exists/i.test(uploadError.message || '')
      ) {
        console.log(`SKIP existing: ${path}`);
        skipped++;
        return;
      }

      throw uploadError;
    }

    console.log(`COPIED: ${path}`);
    copied++;
  } catch (error) {
    console.error(`FAILED: ${path}: ${error.message}`);
    failed++;
  }
}

async function walk(prefix = '') {
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data: entries, error } = await source.storage
      .from(bucketName)
      .list(prefix, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      throw new Error(
        `อ่านรายการ Storage ไม่สำเร็จที่ "${prefix || '/'}": ${error.message}`
      );
    }

    const items = entries || [];

    for (const item of items) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;

      // โฟลเดอร์ใน Storage มักไม่มี id และ metadata
      if (item.id == null && item.metadata == null) {
        await walk(path);
        continue;
      }

      await migrateObject(path, item.metadata);
    }

    if (items.length < limit) break;
    offset += items.length;
  }
}

async function main() {
  console.log('เริ่มตรวจสอบ Storage Migration...');
  console.log(`Source: ${sourceUrl}`);
  console.log(`Target: ${targetUrl}`);
  console.log(`Bucket: ${bucketName}`);

  const [srcBucket, dstBucket] = await Promise.all([
    getBucketInfo(sourceUrl, sourceKey, 'SOURCE'),
    getBucketInfo(targetUrl, targetKey, 'TARGET')
  ]);

  if (srcBucket.public !== dstBucket.public) {
    throw new Error(
      'สถานะ Public/Private ของ bucket ไม่ตรงกัน ยกเลิกเพื่อความปลอดภัย'
    );
  }

  await walk();

  console.log('\n========== สรุป Storage Migration ==========');
  console.log(`คัดลอกสำเร็จ: ${copied}`);
  console.log(`ข้ามไฟล์ที่มีอยู่แล้ว: ${skipped}`);
  console.log(`ล้มเหลว: ${failed}`);
  console.log('============================================');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(`Migration stopped: ${error.message}`);
  process.exitCode = 1;
});
