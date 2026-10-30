<?php

declare(strict_types=1);

namespace App\Services\Seo;

/**
 * Translating between a public URL and its per-locale siblings.
 *
 * hreflang needs one URL per language, and the app had none: the locale came
 * from Accept-Language and localStorage, so every language shared a URL and
 * there was nothing for a crawler to point at. Public pages now carry an
 * optional locale segment, which is what these methods add and remove.
 *
 * The default locale stays unprefixed, so no URL that was already indexed
 * changes and there is exactly one address per language rather than two.
 */
final class LocaleUrlService
{
    /**
     * Locales that appear as a path segment, i.e. every supported locale except
     * the default one.
     *
     * @return list<string>
     */
    public function prefixes(): array
    {
        /** @var list<string> $supported */
        $supported = config('locales.supported', ['en']);

        return array_values(array_filter(
            $supported,
            fn (string $locale): bool => $locale !== $this->defaultLocale(),
        ));
    }

    /**
     * The locale a path names, or null when it names none.
     */
    public function fromPath(string $path): ?string
    {
        $segment = explode('/', ltrim($path, '/'))[0];

        return in_array($segment, $this->prefixes(), true) ? $segment : null;
    }

    /**
     * The same path with any locale segment removed. Has a leading slash
     * except at the root, where the path is '' rather than '/'.
     */
    private function stripLocale(string $path): string
    {
        $segments = array_values(array_filter(explode('/', $path), fn (string $s): bool => $s !== ''));

        if ($segments !== [] && in_array($segments[0], $this->prefixes(), true)) {
            array_shift($segments);
        }

        return $segments === [] ? '' : '/'.implode('/', $segments);
    }

    /**
     * The same path addressed in one locale.
     */
    private function localize(string $path, string $locale): string
    {
        $bare = $this->stripLocale($path);

        return $locale === $this->defaultLocale() ? $bare : '/'.$locale.$bare;
    }

    /**
     * Every locale sibling of an absolute URL, keyed by hreflang value.
     *
     * x-default points at the unprefixed URL: it is what a crawler should serve
     * a visitor whose language none of the others match.
     *
     * @return array<string, string>
     */
    public function alternates(string $url): array
    {
        $origin = $this->origin($url);
        $path = (string) (parse_url($url, PHP_URL_PATH) ?: '');

        $alternates = [];

        /** @var list<string> $supported */
        $supported = config('locales.supported', ['en']);

        foreach ($supported as $locale) {
            $alternates[$locale] = $origin.$this->localize($path, $locale);
        }

        $alternates['x-default'] = $origin.$this->localize($path, $this->defaultLocale());

        return $alternates;
    }

    /**
     * Scheme and host of an absolute URL, with no trailing slash.
     */
    private function origin(string $url): string
    {
        $scheme = parse_url($url, PHP_URL_SCHEME);
        $host = parse_url($url, PHP_URL_HOST);
        $port = parse_url($url, PHP_URL_PORT);

        if (! is_string($scheme) || ! is_string($host)) {
            throw new \InvalidArgumentException('Locale alternates require an absolute URL.');
        }

        return $scheme.'://'.$host.(is_int($port) ? ':'.$port : '');
    }

    /**
     * Never config('app.locale'): App::setLocale() writes to that key, so it
     * reports the current request's language, not the site's unprefixed one.
     */
    private function defaultLocale(): string
    {
        $default = config('locales.default', 'en');

        return is_string($default) ? $default : 'en';
    }
}
