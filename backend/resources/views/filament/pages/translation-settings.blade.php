<x-filament-panels::page>
    <div class="space-y-6">
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        @if(app(\App\Services\Translation\TranslationSettingsService::class)->hasApiKey())
                            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <x-heroicon-s-check style="width: 1.25rem; height: 1.25rem;" class="text-green-600" />
                            </div>
                        @else
                            <div class="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                <x-heroicon-s-exclamation-triangle style="width: 1.25rem; height: 1.25rem;" class="text-amber-600" />
                            </div>
                        @endif
                    </div>
                    <div class="ml-5 w-0 flex-1">
                        <dl>
                            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                OpenRouter Status
                            </dt>
                            <dd class="text-lg font-medium text-gray-900 dark:text-gray-100">
                                @if(app(\App\Services\Translation\TranslationSettingsService::class)->hasApiKey())
                                    <span class="text-green-600">API key configured</span>
                                @else
                                    <span class="text-amber-600">API key not configured</span>
                                @endif
                            </dd>
                        </dl>
                    </div>
                </div>
                <div class="mt-4">
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        Configure OpenRouter credentials and a prompt template for AI-powered translation.
                        Use the test section to verify settings before saving.
                    </p>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                {{ $this->form }}
            </div>
        </div>
    </div>

    {{-- Temporary debug logging for translation settings. Remove after verification. --}}
    <script>
        document.addEventListener('livewire:init', () => {
            Livewire.on('translation-settings-debug', (detail) => {
                const step = detail?.step ?? detail?.[0]?.step ?? 'unknown';
                const payload = detail?.payload ?? detail?.[0]?.payload ?? {};
                const at = detail?.at ?? detail?.[0]?.at ?? null;

                console.groupCollapsed(`[TranslationSettings] ${step}`);
                if (at) {
                    console.log('at', at);
                }
                console.log('payload', payload);
                console.groupEnd();
            });

            console.info('[TranslationSettings] Temporary browser debug logging is enabled.');
        });
    </script>
</x-filament-panels::page>
