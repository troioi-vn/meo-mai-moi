@php
    $record = $getRecord();
    $timeline = [];

    // Build timeline events
    if ($record->created_at) {
        $timeline[] = [
            'timestamp' => $record->created_at,
            'title' => 'Notification Created',
            'description' => 'Notification was created and queued for delivery',
            'icon' => 'heroicon-o-plus-circle',
            'color' => 'primary',
            'status' => 'completed'
        ];
    }

    if ($record->delivered_at) {
        $timeline[] = [
            'timestamp' => $record->delivered_at,
            'title' => 'Email Delivered',
            'description' => 'Email was successfully delivered to recipient',
            'icon' => 'heroicon-o-paper-airplane',
            'color' => 'success',
            'status' => 'completed'
        ];
    }

    if ($record->failed_at) {
        $timeline[] = [
            'timestamp' => $record->failed_at,
            'title' => 'Delivery Failed',
            'description' => $record->failure_reason ?: 'Email delivery failed',
            'icon' => 'heroicon-o-exclamation-triangle',
            'color' => 'danger',
            'status' => 'failed'
        ];
    }

    if ($record->read_at) {
        $timeline[] = [
            'timestamp' => $record->read_at,
            'title' => 'Email Read',
            'description' => 'Recipient opened and read the email',
            'icon' => 'heroicon-o-eye',
            'color' => 'success',
            'status' => 'completed'
        ];
    }

    // Sort by timestamp
    usort($timeline, function($a, $b) {
        return $a['timestamp']->timestamp <=> $b['timestamp']->timestamp;
    });
@endphp

<div class="space-y-4">
    @foreach($timeline as $index => $event)
        <div class="flex items-start space-x-4">
            <!-- Timeline line -->
            <div class="flex flex-col items-center">
                <div class="flex h-8 w-8 items-center justify-center rounded-full {{ $event['status'] === 'failed' ? 'bg-danger-100 text-danger-600 dark:bg-danger-900 dark:text-danger-400' : ($event['color'] === 'success' ? 'bg-success-100 text-success-600 dark:bg-success-900 dark:text-success-400' : 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400') }}">
                    @svg($event['icon'], 'h-4 w-4')
                </div>
                @if($index < count($timeline) - 1)
                    <div class="mt-2 h-8 w-0.5 {{ $event['status'] === 'failed' ? 'bg-danger-200 dark:bg-danger-800' : 'bg-gray-200 dark:bg-gray-700' }}"></div>
                @endif
            </div>

            <!-- Event content -->
            <div class="flex-1 pb-8">
                <div class="flex items-center justify-between">
                    <h4 class="text-sm font-semibold {{ $event['status'] === 'failed' ? 'text-danger-800 dark:text-danger-200' : 'text-gray-900 dark:text-gray-100' }}">
                        {{ $event['title'] }}
                    </h4>
                    <time class="text-xs text-gray-500 dark:text-gray-400">
                        {{ $event['timestamp']->format('M j, Y g:i A') }}
                    </time>
                </div>
                <p class="mt-1 text-sm {{ $event['status'] === 'failed' ? 'text-danger-600 dark:text-danger-400' : 'text-gray-600 dark:text-gray-400' }}">
                    {{ $event['description'] }}
                </p>

                @if($event['status'] === 'failed' && $record->failure_reason)
                    <div class="mt-2 rounded-md bg-danger-50 p-3 dark:bg-danger-950">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                @svg('heroicon-o-exclamation-triangle', 'h-5 w-5 text-danger-400')
                            </div>
                            <div class="ml-3">
                                <h3 class="text-sm font-medium text-danger-800 dark:text-danger-200">
                                    Error Details
                                </h3>
                                <div class="mt-2 text-sm text-danger-700 dark:text-danger-300">
                                    <p>{{ $record->failure_reason }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                @endif
            </div>
        </div>
    @endforeach

    @if(empty($timeline))
        <div class="text-center text-gray-500 dark:text-gray-400">
            <p>No delivery events recorded</p>
        </div>
    @endif
</div>
