<?php

declare(strict_types=1);

namespace App\Services\Seo;

use App\Enums\PlacementRequestStatus;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;

/**
 * The URL list behind /sitemap.xml.
 *
 * robots.txt used to advertise only the VitePress docs sitemap, so the app's own
 * public pages were discoverable only if something already linked to them.
 *
 * Deliberately absent: pet profiles. /pets/{id}/view is reachable without a
 * session, but these are people's own animals, and a machine-readable index of
 * every one of them is a privacy problem rather than a traffic win. Pets reach
 * search engines through the listing their owner chose to open.
 */
final class SitemapService
{
    /**
     * A sitemap may hold 50,000 URLs. Nothing is near that yet; the cap keeps a
     * future growth spurt from silently producing an invalid file.
     */
    private const MAX_URLS = 50000;

    private const CACHE_KEY = 'seo.sitemap.entries';

    private const CACHE_TTL_SECONDS = 3600;

    /**
     * @return list<array{loc: string, lastmod: string|null, changefreq: string, priority: string}>
     */
    public function entries(string $baseUrl): array
    {
        /** @var list<array{loc: string, lastmod: string|null, changefreq: string, priority: string}> $entries */
        $entries = Cache::remember(
            self::CACHE_KEY.':'.md5($baseUrl),
            self::CACHE_TTL_SECONDS,
            fn (): array => $this->build($baseUrl),
        );

        return $entries;
    }

    /**
     * Test support. Entries are cached for an hour, which otherwise leaks
     * between cases in a suite that builds its own listings.
     */
    public function forget(string $baseUrl): void
    {
        Cache::forget(self::CACHE_KEY.':'.md5($baseUrl));
    }

    /**
     * @return list<array{loc: string, lastmod: string|null, changefreq: string, priority: string}>
     */
    private function build(string $baseUrl): array
    {
        $base = rtrim($baseUrl, '/');

        $entries = [
            // No trailing slash, so this matches the canonical the landing
            // shell emits rather than competing with it.
            $this->entry($base, null, 'daily', '1.0'),
            $this->entry($base.'/requests', null, 'hourly', '0.9'),
            $this->entry($base.'/helpers', null, 'daily', '0.7'),
        ];

        // Only open requests. A fulfilled or cancelled one is a dead end for
        // anyone arriving from search, and the detail shell already declines to
        // render a preview for it.
        PlacementRequest::query()
            ->where('status', PlacementRequestStatus::OPEN)
            ->whereHas('pet')
            ->orderByDesc('updated_at')
            ->limit(self::MAX_URLS)
            ->get(['id', 'updated_at'])
            ->each(function (PlacementRequest $placementRequest) use (&$entries, $base): void {
                $entries[] = $this->entry(
                    $base.'/requests/'.$placementRequest->id,
                    $placementRequest->updated_at,
                    'daily',
                    '0.8',
                );
            });

        HelperProfile::query()
            ->publiclyVisible()
            ->orderByDesc('updated_at')
            ->limit(self::MAX_URLS)
            ->get(['id', 'updated_at'])
            ->each(function (HelperProfile $profile) use (&$entries, $base): void {
                $entries[] = $this->entry(
                    $base.'/helpers/'.$profile->id,
                    $profile->updated_at,
                    'weekly',
                    '0.5',
                );
            });

        return array_slice($entries, 0, self::MAX_URLS);
    }

    /**
     * @return array{loc: string, lastmod: string|null, changefreq: string, priority: string}
     */
    private function entry(string $loc, ?CarbonInterface $lastmod, string $changefreq, string $priority): array
    {
        return [
            'loc' => $loc,
            'lastmod' => $lastmod?->toAtomString(),
            'changefreq' => $changefreq,
            'priority' => $priority,
        ];
    }
}
