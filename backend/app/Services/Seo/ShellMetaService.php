<?php

declare(strict_types=1);

namespace App\Services\Seo;

use App\Enums\PlacementRequestType;
use App\Models\City;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PlacementQuestion;
use App\Models\PlacementRequest;
use Illuminate\Support\Collection;

/**
 * Head metadata for the public SPA shell routes.
 *
 * Every public page used to serve the same hardcoded "Meo Mai Moi" title, which
 * is what search results showed and what a shared link previewed as. The React
 * app still renders these pages; this only fills the head a crawler reads
 * before any JavaScript runs.
 *
 * Callers pass the canonical URL rather than letting this reach for the current
 * request, so the output is a pure function of its arguments.
 *
 * @phpstan-type ShellMeta array{ogTitle: string, ogDescription: string, ogType: string, ogImage: string|null, ogUrl: string, canonicalUrl: string, jsonLd: array<string, mixed>|null, alternates: array<string, string>}
 */
final class ShellMetaService
{
    public function __construct(private readonly LocaleUrlService $localeUrls) {}

    /**
     * Link previews truncate around here, and so does Google.
     */
    private const DESCRIPTION_LIMIT = 160;

    /**
     * @return ShellMeta
     */
    public function forLanding(string $url): array
    {
        return $this->meta(
            title: __('messages.seo.landing.title'),
            description: __('messages.seo.landing.description'),
            url: $url,
            jsonLd: [
                '@context' => 'https://schema.org',
                '@type' => 'Organization',
                'name' => 'Meo Mai Moi',
                'url' => $url,
                'description' => __('messages.seo.landing.description'),
            ],
        );
    }

    /**
     * @return ShellMeta
     */
    public function forPlacementIndex(string $url): array
    {
        return $this->meta(
            title: __('messages.seo.placements.title'),
            description: __('messages.seo.placements.description'),
            url: $url,
        );
    }

    /**
     * @return ShellMeta
     */
    public function forHelperIndex(string $url): array
    {
        return $this->meta(
            title: __('messages.seo.helpers.title'),
            description: __('messages.seo.helpers.description'),
            url: $url,
        );
    }

    /**
     * @return ShellMeta
     */
    public function forHelperProfile(HelperProfile $profile, string $url): array
    {
        $location = $this->location($profile->city, $profile->country);

        return $this->meta(
            title: $location === null
                ? __('messages.seo.helper_profile.title_without_location')
                : __('messages.seo.helper_profile.title', ['location' => $location]),
            description: $this->shorten($profile->experience)
                ?? __('messages.seo.helper_profile.description'),
            url: $url,
            type: 'profile',
        );
    }

    /**
     * @return ShellMeta
     */
    public function forPublicPet(Pet $pet, string $url): array
    {
        $location = $this->location($pet->city, $pet->country);

        return $this->meta(
            title: $location === null
                ? __('messages.seo.pet.title', ['name' => $pet->name])
                : __('messages.seo.pet.title_with_location', ['name' => $pet->name, 'location' => $location]),
            description: $this->shorten($pet->description)
                ?? __('messages.seo.pet.description', ['name' => $pet->name]),
            url: $url,
            type: 'article',
            image: $pet->photo_url,
        );
    }

    /**
     * Published Q&A becomes FAQPage structured data. The rescue side wrote both
     * halves of every pair here, so this describes real content rather than
     * decorating the page with markup nobody can see.
     *
     * @param  Collection<int, PlacementQuestion>  $publishedQuestions
     * @return ShellMeta
     */
    public function forPlacementRequest(
        PlacementRequest $placementRequest,
        Pet $pet,
        string $url,
        Collection $publishedQuestions,
    ): array {
        $answered = $publishedQuestions
            ->filter(fn (PlacementQuestion $question): bool => $question->isAnswered())
            ->values();

        return $this->meta(
            title: $this->placementTitle($pet->name, $placementRequest->request_type),
            description: $this->shorten($placementRequest->notes)
                ?? __('messages.placement.og.fallback'),
            url: $url,
            type: 'article',
            image: $pet->photo_url,
            jsonLd: $answered->isEmpty() ? null : [
                '@context' => 'https://schema.org',
                '@type' => 'FAQPage',
                'mainEntity' => $answered->map(fn (PlacementQuestion $question): array => [
                    '@type' => 'Question',
                    'name' => $this->shorten($question->question) ?? '',
                    'acceptedAnswer' => [
                        '@type' => 'Answer',
                        'text' => $this->flatten((string) $question->answer),
                    ],
                ])->all(),
            ],
        );
    }

    private function placementTitle(string $petName, PlacementRequestType $type): string
    {
        return match ($type) {
            PlacementRequestType::PERMANENT => __('messages.placement.og.permanent', ['name' => $petName]),
            PlacementRequestType::PET_SITTING => __('messages.placement.og.pet_sitting', ['name' => $petName]),
            default => __('messages.placement.og.foster', ['name' => $petName]),
        };
    }

    /**
     * @param  array<string, mixed>|null  $jsonLd
     * @return ShellMeta
     */
    private function meta(
        string $title,
        string $description,
        string $url,
        string $type = 'website',
        ?string $image = null,
        ?array $jsonLd = null,
    ): array {
        return [
            'ogTitle' => $title,
            'ogDescription' => $description,
            'ogType' => $type,
            'ogImage' => $image,
            'ogUrl' => $url,
            'canonicalUrl' => $url,
            'jsonLd' => $jsonLd,
            // Same page, every language. Derived from the URL the caller passed
            // so this stays a pure function of its arguments.
            'alternates' => $this->localeUrls->alternates($url),
        ];
    }

    /**
     * "Hanoi, VN", or whichever half of it the record actually has.
     *
     * Both models carry a free-text `city` column and a `city()` relation under
     * the same name, so what this receives depends on whether the relation was
     * eager-loaded. PlacementRequestResource copes with the same pair.
     */
    private function location(City|string|null $city, ?string $country): ?string
    {
        $cityName = match (true) {
            is_string($city) => $city,
            $city instanceof City => is_string($city->name) ? $city->name : null,
            default => null,
        };

        $parts = array_values(array_filter(
            [$cityName, $country],
            fn (?string $part): bool => $part !== null && trim($part) !== '',
        ));

        return $parts === [] ? null : implode(', ', array_map('trim', $parts));
    }

    /**
     * Flatten to one line and clip to preview length, or null when there is
     * nothing to say, so callers can fall back to a translated default.
     */
    private function shorten(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        $flattened = $this->flatten($text);

        if ($flattened === '') {
            return null;
        }

        return mb_strimwidth($flattened, 0, self::DESCRIPTION_LIMIT, '...');
    }

    /**
     * Newlines break some crawlers' attribute parsing.
     */
    private function flatten(string $text): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $text));
    }
}
