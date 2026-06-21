export async function downloadImage(src: string, filename: string) {
  const response = await fetch(src)
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export async function copyImageToClipboard(src: string) {
  const response = await fetch(src)
  const blob = await response.blob()
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
}
