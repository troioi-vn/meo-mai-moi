<x-filament-widgets::widget>
    <x-filament::section>
        @if($hasAlerts)
            <div class="space-y-3">
                <div class="flex items-center gap-2">
                    @if($hasDanger)
                        <x-heroicon-o-x-circle style="width: 1.25rem; height: 1.25rem; flex-shrink: 0;" class="text-danger-500" />
                    @else
                        <x-heroicon-o-exclamation-triangle style="width: 1.25rem; height: 1.25rem; flex-shrink: 0;" class="text-warning-500" />
                    @endif
                    <h3 class="text-lg font-semibold">Email System Alerts</h3>
                </div>

                @foreach($alerts as $alert)
                    <div class="rounded-lg border p-4 {{ $alert['type'] === 'danger' ? 'border-danger-200 bg-danger-50 dark:border-danger-700 dark:bg-danger-900/30' : 'border-warning-200 bg-warning-50 dark:border-warning-700 dark:bg-warning-900/30' }}">
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    @if($alert['type'] === 'danger')
                                        <x-heroicon-o-x-circle style="width: 1.25rem; height: 1.25rem; flex-shrink: 0;" class="text-danger-600 dark:text-danger-400" />
                                    @else
                                        <x-heroicon-o-exclamation-triangle style="width: 1.25rem; height: 1.25rem; flex-shrink: 0;" class="text-warning-600 dark:text-warning-400" />
                                    @endif
                                    <h4 class="font-semibold {{ $alert['type'] === 'danger' ? 'text-danger-800 dark:text-danger-200' : 'text-warning-800 dark:text-warning-200' }}">
                                        {{ $alert['title'] }}
                                    </h4>
                                </div>
                                <p class="mt-1 text-sm {{ $alert['type'] === 'danger' ? 'text-danger-700 dark:text-danger-300' : 'text-warning-700 dark:text-warning-300' }}">
                                    {{ $alert['message'] }}
                                </p>
                            </div>

                            @if($alert['action_url'] !== '#')
                                <div class="flex-shrink-0">
                                    <a href="{{ $alert['action_url'] }}"
                                       class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {{ $alert['type'] === 'danger' ? 'bg-danger-100 text-danger-800 hover:bg-danger-200 dark:bg-danger-900 dark:text-danger-200 dark:hover:bg-danger-800/80' : 'bg-warning-100 text-warning-800 hover:bg-warning-200 dark:bg-warning-900 dark:text-warning-200 dark:hover:bg-warning-800/80' }}">
                                        {{ $alert['action'] }}
                                        <x-heroicon-o-arrow-right class="h-4 w-4" />
                                    </a>
                                </div>
                            @endif
                        </div>
                    </div>
                @endforeach
            </div>
        @else
            <div class="flex items-center gap-2 text-success-600 dark:text-success-400">
                <x-heroicon-o-check-circle style="width: 1.25rem; height: 1.25rem; flex-shrink: 0;" />
                <span class="font-medium">All email systems are operating normally</span>
            </div>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>
