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
            'is_primary' => $isPrimary,
            'processing' => self::isProcessing($media, [
                $displayConversion,
                $thumbConversion,
                $mediumConversion,
                $webpConversion,
            ]),
        ];
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
