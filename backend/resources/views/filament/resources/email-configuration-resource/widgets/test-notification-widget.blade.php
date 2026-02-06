<x-filament-widgets::widget>
    <x-filament::section>
        <div class="flex items-center gap-2">
            <x-heroicon-o-bell class="h-5 w-5 text-primary-600" />
            <h3 class="text-lg font-semibold">Test Notification</h3>
        </div>

        <div class="mt-4">
            {{ $this->form }}
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
