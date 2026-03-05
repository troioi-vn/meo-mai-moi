<x-filament-panels::page>
    <div class="space-y-6">
        <!-- Current Status Card -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        @if($this->invite_only_enabled)
                            <div class="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                <x-heroicon-s-lock-closed style="width: 1.25rem; height: 1.25rem;" class="text-amber-600" />
                            </div>

                        @else
                            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <x-heroicon-s-lock-open style="width: 1.25rem; height: 1.25rem;" class="text-green-600" />
                            </div>
                        @endif
                    </div>
                    <div class="ml-5 w-0 flex-1">
                        <dl>
                            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                Current Registration Mode
                            </dt>
                            <dd class="text-lg font-medium text-gray-900 dark:text-gray-100">
                                @if($this->invite_only_enabled)
                                    <span class="text-amber-600">Invite-Only Registration</span>
                                @else
                                    <span class="text-green-600">Open Registration</span>
                                @endif
                            </dd>
                        </dl>
                    </div>
                </div>
                <div class="mt-4">
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        @if($this->invite_only_enabled)
                            Only users with valid invitation codes can register. New users without invitations can join the waitlist.
                        @else
                            Anyone can register freely without requiring an invitation code.
                        @endif
                    </p>
                </div>
            </div>
        </div>

        <!-- Settings Form -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                {{ $this->form }}
            </div>
        </div>

        <!-- Information Cards -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <!-- Invite-Only Mode Info -->
            <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div class="flex items-start gap-3">
                    <x-heroicon-s-information-circle style="width: 1.25rem; height: 1.25rem; flex-shrink: 0;" class="mt-0.5 text-amber-500" />
                    <div>
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Invite-Only Mode
                        </h3>
                        <ul class="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300" role="list">
                            <li class="flex items-start gap-2">
                                <span class="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500"></span>
                                <span>Users need invitation codes to register</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500"></span>
                                <span>Non-invited users can join the waitlist</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500"></span>
                                <span>Admins can manage waitlist and send invitations</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500"></span>
                                <span>Provides controlled access to the platform</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Open Registration Info -->
            <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div class="flex items-start gap-3">
                    <x-heroicon-s-information-circle style="width: 1.25rem; height: 1.25rem; flex-shrink: 0;" class="mt-0.5 text-green-500" />
                    <div>
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Open Registration
                        </h3>
                        <ul class="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300" role="list">
                            <li class="flex items-start gap-2">
                                <span class="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500"></span>
                                <span>Anyone can register without restrictions</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500"></span>
                                <span>No invitation codes required</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500"></span>
                                <span>Faster user onboarding</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500"></span>
                                <span>Suitable for public launches</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-filament-panels::page>