export async function getActualImageSize(src: string): Promise<{ width: number; height: number }> {
  const image = new Image()
  image.decoding = 'async'
  image.src = src

  await image.decode()

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
  }
}
