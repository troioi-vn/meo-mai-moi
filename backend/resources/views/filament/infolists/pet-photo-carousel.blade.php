@php
    $photos = $getState() ?? [];
    $count = count($photos);
@endphp

@if ($count === 0)
    <div class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        No photos uploaded.
    </div>
@else
    <div
        x-data="{ index: 0, total: {{ $count }} }"
        class="space-y-3"
    >
        <div class="relative overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            @foreach ($photos as $i => $photo)
                <div x-show="index === {{ $i }}" class="p-2" x-cloak>
                    <img
                        src="{{ $photo['url'] ?? '' }}"
                        alt="Pet photo {{ $i + 1 }}"
                        class="mx-auto h-36 w-36 rounded-md object-cover"
                    >
                    <div class="mt-3 flex items-center justify-between">
                        <span class="text-xs text-gray-500 dark:text-gray-400">
                            {{ $i + 1 }} / {{ $count }}
                        </span>
                        <x-filament::button
                            size="sm"
                            color="danger"
                            wire:click="removePhoto({{ (int) ($photo['id'] ?? 0) }})"
                            wire:confirm="Remove this photo?"
                        >
                            Remove
                        </x-filament::button>
                    </div>
                </div>
            @endforeach

            @if ($count > 1)
                <button
                    type="button"
                    class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-700 shadow hover:bg-white dark:bg-gray-800/80 dark:text-gray-200"
                    x-on:click="index = (index - 1 + total) % total"
                    aria-label="Previous photo"
                >
                    <x-heroicon-o-chevron-left style="width: 1.25rem; height: 1.25rem;" />
                </button>
                <button
                    type="button"
                    class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-700 shadow hover:bg-white dark:bg-gray-800/80 dark:text-gray-200"
                    x-on:click="index = (index + 1) % total"
                    aria-label="Next photo"
                >
                    <x-heroicon-o-chevron-right style="width: 1.25rem; height: 1.25rem;" />
                </button>
            @endif
        </div>

        @if ($count > 1)
            <div class="flex gap-2 overflow-x-auto pb-1">
                @foreach ($photos as $i => $photo)
                    <button
                        type="button"
                        class="h-14 w-14 shrink-0 overflow-hidden rounded border"
                        :class="index === {{ $i }}
                            ? 'border-primary-500 ring-1 ring-primary-500'
                            : 'border-gray-200 dark:border-gray-700'"
                        x-on:click="index = {{ $i }}"
                    >
                        <img
                            src="{{ $photo['thumb_url'] ?? ($photo['url'] ?? '') }}"
                            alt="Thumbnail {{ $i + 1 }}"
                            class="h-full w-full object-cover"
                        >
                    </button>
                @endforeach
            </div>
        @endif
    </div>
@endif
