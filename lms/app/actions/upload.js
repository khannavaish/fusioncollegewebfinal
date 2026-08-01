import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function saveLocalFile(file, folder = 'photos') {
  if (!file || typeof file === 'string' || !file.name) return null;

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get original extension
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${uuidv4()}.${ext}`;
    
    // Ensure directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder);
    await mkdir(uploadDir, { recursive: true });

    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    return `/uploads/${folder}/${fileName}`;
  } catch (e) {
    console.error('File upload failed:', e);
    return null;
  }
}
