<x-filament-panels::page>
    <div class="space-y-6">
        <x-filament::section>
            <x-slot name="heading">Queued jobs</x-slot>
            <x-slot name="description">Database queue depth and the oldest 100 jobs. Serialized payloads are intentionally hidden.</x-slot>

            <div class="mb-4 text-sm text-gray-600 dark:text-gray-300">
                Queue depth: <span class="font-semibold">{{ number_format($this->queueDepth) }}</span>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                    <thead>
                        <tr class="text-left text-gray-500 dark:text-gray-400">
                            <th class="px-3 py-2">Job</th>
                            <th class="px-3 py-2">Queue</th>
                            <th class="px-3 py-2">Age</th>
                            <th class="px-3 py-2">Attempts</th>
                            <th class="px-3 py-2">State</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                        @forelse($this->queuedJobs as $job)
                            <tr>
                                <td class="px-3 py-2 font-medium">{{ $job['type'] }}</td>
                                <td class="px-3 py-2">{{ $job['queue'] }}</td>
                                <td class="px-3 py-2">{{ \Illuminate\Support\Carbon::createFromTimestamp($job['created_at'])->diffForHumans() }}</td>
                                <td class="px-3 py-2">{{ $job['attempts'] }}</td>
                                <td class="px-3 py-2">{{ $job['reserved'] ? 'Reserved' : ($job['available_at'] > now()->timestamp ? 'Delayed' : 'Available') }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="5" class="px-3 py-6 text-center text-gray-500">No queued jobs.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </x-filament::section>

        <x-filament::section>
            <x-slot name="heading">Failed jobs</x-slot>
            <x-slot name="description">The newest 100 failed jobs. Only a shortened first exception line is shown.</x-slot>

            <div class="overflow-x-auto">
                <table class="w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                    <thead>
                        <tr class="text-left text-gray-500 dark:text-gray-400">
                            <th class="px-3 py-2">Job</th>
                            <th class="px-3 py-2">Queue</th>
                            <th class="px-3 py-2">Failed</th>
                            <th class="px-3 py-2">Exception</th>
                            <th class="px-3 py-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                        @forelse($this->failedJobs as $job)
                            <tr>
                                <td class="px-3 py-2 font-medium">{{ $job['type'] }}</td>
                                <td class="px-3 py-2">{{ $job['connection'] }} / {{ $job['queue'] }}</td>
                                <td class="px-3 py-2">{{ \Illuminate\Support\Carbon::parse($job['failed_at'])->diffForHumans() }}</td>
                                <td class="max-w-xl px-3 py-2 text-gray-600 dark:text-gray-300">{{ $job['exception'] }}</td>
                                <td class="px-3 py-2 text-right">
                                    <div class="flex justify-end gap-2">
                                        <x-filament::button
                                            size="sm"
                                            color="warning"
                                            wire:click="retryFailed(@js($job['uuid']))"
                                            wire:confirm="Retry this failed job using its original queue and connection?"
                                        >
                                            Retry
                                        </x-filament::button>
                                        <x-filament::button
                                            size="sm"
                                            color="danger"
                                            wire:click="deleteFailed(@js($job['uuid']))"
                                            wire:confirm="Permanently delete this failed-job record? This cannot be undone."
                                        >
                                            Delete
                                        </x-filament::button>
                                    </div>
                                </td>
                            </tr>
                        @empty
                            <tr><td colspan="5" class="px-3 py-6 text-center text-gray-500">No failed jobs.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </x-filament::section>
    </div>
</x-filament-panels::page>
