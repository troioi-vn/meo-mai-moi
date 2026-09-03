<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Http\Middleware\SetLocaleMiddleware;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SetLocaleMiddlewareTest extends TestCase
{
    private SetLocaleMiddleware $middleware;

    protected function setUp(): void
    {
        parent::setUp();

        $this->middleware = new SetLocaleMiddleware;
        App::setLocale(config('app.locale', 'en'));
    }

    protected function tearDown(): void
    {
        App::setLocale(config('app.locale', 'en'));

        parent::tearDown();
    }

    /**
     * @return array<string, array{header: ?string, expected: string}>
     */
    public static function acceptLanguageProvider(): array
    {
        return [
            // Already-correct rows: must keep resolving exactly as-is.
            'region subtag stripped' => ['header' => 'uk-UA,uk;q=0.9,ru;q=0.8', 'expected' => 'uk'],
            'region only' => ['header' => 'ru-RU', 'expected' => 'ru'],
            'vietnamese region' => ['header' => 'vi-VN', 'expected' => 'vi'],
            'english with quality' => ['header' => 'en-US,en;q=0.9', 'expected' => 'en'],
            'unsupported first falls through' => ['header' => 'zh-CN,zh;q=0.9,en;q=0.8', 'expected' => 'en'],
            'unsupported only falls back to default' => ['header' => 'pt-BR', 'expected' => 'en'],
            'empty header falls back to default' => ['header' => '', 'expected' => 'en'],
            'wildcard falls back to default' => ['header' => '*', 'expected' => 'en'],
            'whitespace around separator' => ['header' => 'uk ; q=0.9,en', 'expected' => 'en'],
            // Fixed cases.
            'repeated tag keeps highest quality, not last write' => ['header' => 'en-US,uk;q=0.8,en;q=0.1', 'expected' => 'en'],
            'underscore subtag normalized' => ['header' => 'uk_UA', 'expected' => 'uk'],
            // Malformed input.
            'malformed q loses to a valid quality' => ['header' => 'en;q=abc,ru;q=0.5', 'expected' => 'ru'],
            'absent header falls back to default' => ['header' => null, 'expected' => 'en'],
        ];
    }

    #[Test]
    #[DataProvider('acceptLanguageProvider')]
    public function it_resolves_guest_locale_from_accept_language(?string $header, string $expected): void
    {
        $request = $this->makeRequest($header);

        $this->middleware->handle($request, fn () => response('ok'));

        $this->assertSame($expected, App::getLocale());
    }

    #[Test]
    public function it_prefers_accept_language_over_the_authenticated_users_stored_locale(): void
    {
        $user = User::factory()->create(['locale' => 'en']);
        $this->actingAs($user);

        $request = $this->makeRequest('ru');

        $this->middleware->handle($request, fn () => response('ok'));

        $this->assertSame('ru', App::getLocale());
    }

    #[Test]
    public function it_falls_back_to_the_authenticated_users_stored_locale_without_a_header(): void
    {
        $user = User::factory()->create(['locale' => 'vi']);
        $this->actingAs($user);

        $request = $this->makeRequest(null);

        $this->middleware->handle($request, fn () => response('ok'));

        $this->assertSame('vi', App::getLocale());
    }

    private function makeRequest(?string $header): Request
    {
        $request = Request::create('/', 'GET');

        // Request::create seeds a default Accept-Language; strip it so a null
        // header really means "absent", like a client that sends nothing.
        $request->headers->remove('Accept-Language');

        if ($header !== null) {
            $request->headers->set('Accept-Language', $header);
        }

        return $request;
    }
}
