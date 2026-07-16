export interface MediaImageSource {
  type: string
  srcset: string
}

export interface ResponsiveMediaFields {
  srcset?: string | null
  sources?: MediaImageSource[]
  width?: number | null
  height?: number | null
}

export const responsiveMediaProps = (media: ResponsiveMediaFields, sizes: string) => ({
  srcSet: media.srcset,
  sources: media.sources,
  sizes,
  width: media.width,
  height: media.height,
})
