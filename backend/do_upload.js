import fs from 'fs';
import { uploadToMinio } from './services/minio.service.js';

async function run() {
    try {
        const buffer = fs.readFileSync('./uploads/avatar/Default_Avatar.jpg');
        await uploadToMinio('avatars/Default_Avatar.jpg', buffer, 'image/jpeg');
        console.log('Uploaded default avatar to MinIO');
    } catch(err) {
        console.error(err);
    }
}
run();