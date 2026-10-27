export async function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: fd }
  );
  if (!res.ok) throw new Error("Photo upload failed. Check your Cloudinary name and preset.");
  return (await res.json()).secure_url;
}