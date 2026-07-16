<?php

declare(strict_types=1);

namespace App\Models;

use Spatie\MediaLibrary\MediaCollections\Models\Media;

final class MediaImageSerializer
{
    /**
     * @return array{
     *   id: int,
     *   url: string,
     *   thumb_url: string|null,
     *   medium_url: string|null,
     *   webp_url: string|null,
     *   srcset: string|null,
     *   sources: array<int, array{type: string, srcset: string}>,
     *   width: int|null,
     *   height: int|null,
     *   is_primary: bool,
     *   processing: bool
     * }
     */
    public static function serialize(
        Media $media,
        bool $isPrimary = false,
        ?string $displayConversion = 'medium',
        ?string $thumbConversion = 'thumb',
        ?string $mediumConversion = 'medium',
        ?string $webpConversion = 'webp',
    ): array {
        $originalUrl = $media->getUrl();

        $thumbUrl = $thumbConversion === null
            ? null
            : self::conversionUrl($media, $thumbConversion) ?? $originalUrl;
        $mediumUrl = $mediumConversion === null
            ? null
            : self::conversionUrl($media, $mediumConversion) ?? $originalUrl;

        return [
            'id' => $media->id,
            'url' => self::conversionUrl($media, $displayConversion) ?? $originalUrl,
            'thumb_url' => $thumbUrl,
            'medium_url' => $mediumUrl,
            'webp_url' => self::conversionUrl($media, $webpConversion),
            'srcset' => self::responsiveSrcset($media),
            'sources' => self::sources($media, $webpConversion),
            'width' => self::dimension($media, 'width'),
            'height' => self::dimension($media, 'height'),
            'is_primary' => $isPrimary,
            'processing' => self::isProcessing($media, [
                $displayConversion,
                $thumbConversion,
                $mediumConversion,
                $webpConversion,
            ]),
        ];
    }

    private static function responsiveSrcset(Media $media, string $conversion = ''): ?string
    {
        $srcset = $media->getSrcset($conversion);

        return $srcset === '' ? null : $srcset;
    }

    /**
     * @return array<int, array{type: string, srcset: string}>
     */
    private static function sources(Media $media, ?string $webpConversion): array
    {
        if ($webpConversion === null || ! $media->hasGeneratedConversion($webpConversion)) {
            return [];
        }

        $srcset = self::responsiveSrcset($media, $webpConversion);

        return $srcset === null ? [] : [['type' => 'image/webp', 'srcset' => $srcset]];
    }

    private static function dimension(Media $media, string $name): ?int
    {
        $value = $media->getCustomProperty("image.{$name}");

        return is_int($value) && $value > 0 ? $value : null;
    }

    private static function conversionUrl(Media $media, ?string $conversion): ?string
    {
        if ($conversion === null || ! $media->hasGeneratedConversion($conversion)) {
            return null;
        }

        return $media->getUrl($conversion);
    }

    /**
     * @param  array<int, string|null>  $conversions
     */
    private static function isProcessing(Media $media, array $conversions): bool
    {
        foreach (array_unique(array_filter($conversions)) as $conversion) {
            if (! $media->hasGeneratedConversion($conversion)) {
                return true;
            }
        }

        return false;
    }
}
