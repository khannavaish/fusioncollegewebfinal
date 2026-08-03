import { v4 as uuidv4 } from 'uuid';
import { createAdminClient } from '@/utils/supabase/admin';

export async function saveLocalFile(file, folder = 'photos') {
  if (!file || typeof file === 'string' || !file.name) return null;

  try {
    const supabase = createAdminClient();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get original extension
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${uuidv4()}.${ext}`;
    const filePath = `${folder}/${fileName}`;
    
    // Ensure bucket exists (we use 'avatars' bucket)
    const bucketName = 'avatars';
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (!bucketsError) {
      const bucketExists = buckets.some(b => b.name === bucketName);
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, { public: true });
      }
    }

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return null;
    }

    // Return the public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (e) {
    console.error('File upload failed:', e);
    return null;
  }
}
