<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\User;
use App\Services\QueueOperationsService;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Throwable;

class QueueOperations extends Page
{
    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-queue-list';

    protected static string|\UnitEnum|null $navigationGroup = 'Operations';

    protected static ?string $navigationLabel = 'Queue Operations';

    protected static ?string $title = 'Queue Operations';

    protected static ?int $navigationSort = 9;

    protected string $view = 'filament.pages.queue-operations';

    /**
     * @return list<array{id: int, queue: string, type: string, attempts: int, reserved: bool, available_at: int, created_at: int}>
     */
    public function getQueuedJobsProperty(): array
    {
        return app(QueueOperationsService::class)->queuedJobs();
    }

    public function getQueueDepthProperty(): int
    {
        return app(QueueOperationsService::class)->queueDepth();
    }

    /**
     * @return list<array{uuid: string, connection: string, queue: string, type: string, exception: string, failed_at: string}>
     */
    public function getFailedJobsProperty(): array
    {
        return app(QueueOperationsService::class)->failedJobs();
    }

    public function retryFailed(string $uuid): void
    {
        try {
            $retried = app(QueueOperationsService::class)->retryFailed($uuid);

            Notification::make()
                ->title($retried ? 'Failed job queued for retry' : 'Failed job no longer exists')
                ->color($retried ? 'success' : 'warning')
                ->send();
        } catch (Throwable $exception) {
            report($exception);

            Notification::make()
                ->title('Failed job could not be retried')
                ->body('Check application logs for details.')
                ->danger()
                ->send();
        }
    }

    public function deleteFailed(string $uuid): void
    {
        try {
            $deleted = app(QueueOperationsService::class)->deleteFailed($uuid);

            Notification::make()
                ->title($deleted ? 'Failed job deleted' : 'Failed job no longer exists')
                ->color($deleted ? 'success' : 'warning')
                ->send();
        } catch (Throwable $exception) {
            report($exception);

            Notification::make()
                ->title('Failed job could not be deleted')
                ->body('Check application logs for details.')
                ->danger()
                ->send();
        }
    }

    public static function canAccess(): bool
    {
        $user = auth()->user();

        return $user instanceof User && $user->hasRole('super_admin');
    }
}
