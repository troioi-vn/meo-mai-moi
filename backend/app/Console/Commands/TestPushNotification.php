<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\User;
use App\Services\Notifications\WebPushDispatcher;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;

class TestPushNotification extends Command
{
    protected $signature = 'push:test {user_id} {--title=Test Notification} {--message=This is a test push notification}';

    protected $description = 'Send a test push notification to a specific user';

    public function handle(WebPushDispatcher $dispatcher): int
    {
        $userId = $this->argument('user_id');
        $user = User::find($userId);

        if (! $user) {
            $this->error("User with ID {$userId} not found");

            return 1;
        }

        $subscriptions = $user->pushSubscriptions()->get();
        if ($subscriptions->isEmpty()) {
            $this->error("User {$user->email} has no push subscriptions");

            return 1;
        }

        $this->info("Found {$subscriptions->count()} subscription(s) for {$user->email}");

        // Create a test notification
        $notification = new Notification();
        $notification->id = fake()->randomNumber();
        $notification->user_id = $user->id;
        $notification->type = 'test';
        $notification->message = $this->option('message');
        $dashboardUrl = config('app.url');
        if (Route::has('dashboard')) {
            $dashboardUrl = route('dashboard');
        } elseif (Route::has('home')) {
            $dashboardUrl = route('home');
        } else {
            $dashboardUrl = URL::to('/');
        }

        $notification->data = [
            'title' => $this->option('title'),
            'body' => $this->option('message'),
            'channel' => 'in_app',
            'url' => $dashboardUrl,
        ];
        $notification->created_at = now();

        try {
            $dispatcher->dispatch($user, $notification);
            $this->info('Test notification dispatched successfully');

            return 0;
        } catch (\Exception $e) {
            $this->error('Failed to dispatch notification: '.$e->getMessage());

            return 1;
        }
    }
}
