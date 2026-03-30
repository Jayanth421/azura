import { apiFetch } from './api.js'

export async function uploadToCloudinary(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    throw new Error('Image data missing.')
  }
  const res = await apiFetch('/api/uploads/cloudinary', {
    method: 'POST',
    body: { dataUrl },
  })
  return res
}
