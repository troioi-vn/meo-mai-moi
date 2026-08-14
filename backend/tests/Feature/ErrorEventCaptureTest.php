<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ErrorEvent;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ErrorEventCaptureTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware('api')->group(function (): void {
            Route::get('/api/testing/runtime-error', function (): never {
                throw new RuntimeException('The diagnostic failure message');
            });
            Route::get('/api/testing/validation-error', function (): never {
                throw ValidationException::withMessages(['field' => 'Invalid']);
            });
            Route::get('/api/testing/status-error/{status}', function (int $status): never {
                abort($status);
            });
        });

        Artisan::command('testing:error-event-console-failure', function (): never {
            $exception = new RuntimeException('The console diagnostic failure message');
            report($exception);

            throw $exception;
        });
    }

    #[Test]
    public function an_unhandled_backend_exception_is_recorded_once_without_changing_the_response(): void
    {
        $this->getJson('/api/testing/runtime-error')->assertInternalServerError();

        $this->assertDatabaseCount('error_events', 1);
        $this->assertDatabaseHas('error_events', [
            'source' => 'backend',
            'message' => 'The diagnostic failure message',
            'exception_class' => RuntimeException::class,
            'route' => 'api/testing/runtime-error',
            'method' => 'GET',
            'status_code' => 500,
            'app_version' => config('version.api'),
        ]);

        $event = ErrorEvent::query()->sole();
        $this->assertNotEmpty($event->stack);
    }

    #[Test]
    public function expected_control_flow_failures_are_not_recorded(): void
    {
        $this->getJson('/api/testing/validation-error')->assertUnprocessable();
        $this->getJson('/api/testing/status-error/401')->assertUnauthorized();
        $this->getJson('/api/testing/status-error/403')->assertForbidden();
        $this->getJson('/api/testing/status-error/404')->assertNotFound();
        $this->getJson('/api/testing/status-error/429')->assertTooManyRequests();

        $this->assertDatabaseCount('error_events', 0);
    }

    #[Test]
    public function an_artisan_failure_is_recorded_as_a_console_error(): void
    {
        try {
            $this->artisan('testing:error-event-console-failure');
            $this->fail('The artisan command should throw.');
        } catch (RuntimeException $exception) {
            $this->assertSame('The console diagnostic failure message', $exception->getMessage());
        }

        $this->assertDatabaseHas('error_events', [
            'source' => 'backend',
            'message' => 'The console diagnostic failure message',
            'route' => 'console',
            'method' => null,
            'status_code' => 500,
        ]);
    }
}
