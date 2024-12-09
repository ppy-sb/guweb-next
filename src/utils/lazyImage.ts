export function loadImage(src: string) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', resolve)
    image.addEventListener('error', reject)
    image.src = src
  })
}

export function onLazyImageError(e: ErrorEvent & { target: HTMLImageElement }) {
  e.target.onerror = null
  e.target.src = '/images/image-placeholder.svg'
}
