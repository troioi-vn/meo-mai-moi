<?php

declare(strict_types=1);

namespace App\Http\Controllers\Seo;

use App\Http\Controllers\Controller;
use App\Services\Seo\SitemapService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ShowSitemapController extends Controller
{
    public function __construct(private readonly SitemapService $sitemap) {}

    public function __invoke(Request $request): Response
    {
        // The sitemap must advertise the host the app actually serves from, not
        // whichever one this container answers on.
        $entries = $this->sitemap->entries(frontend_url());

        $lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
        $lines[] = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

        foreach ($entries as $entry) {
            $lines[] = '  <url>';
            $lines[] = '    <loc>'.e($entry['loc']).'</loc>';

            if ($entry['lastmod'] !== null) {
                $lines[] = '    <lastmod>'.e($entry['lastmod']).'</lastmod>';
            }

            $lines[] = '    <changefreq>'.e($entry['changefreq']).'</changefreq>';
            $lines[] = '    <priority>'.e($entry['priority']).'</priority>';
            $lines[] = '  </url>';
        }

        $lines[] = '</urlset>';

        return response(implode("\n", $lines)."\n", 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
