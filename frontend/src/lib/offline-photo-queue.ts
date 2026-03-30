const deferredPetPhotos: File[] = []

export function enqueueDeferredPetPhoto(file: File) {
  deferredPetPhotos.push(file)
}

export function consumeDeferredPetPhoto() {
  return deferredPetPhotos.shift() ?? null
}

export function getDeferredPetPhotoCount() {
  return deferredPetPhotos.length
}

export function clearDeferredPetPhotos() {
  deferredPetPhotos.length = 0
}
