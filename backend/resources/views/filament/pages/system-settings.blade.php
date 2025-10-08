<x-filament-panels::page>
    <div class="space-y-6">
        <!-- Current Status Card -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        @if($this->invite_only_enabled)
                            <div class="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                <x-heroicon-s-lock-closed class="w-5 h-5 text-amber-600" />
                            </div>

                        @else
                            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <x-heroicon-s-lock-open class="w-5 h-5 text-green-600" />
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
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Invite-Only Mode Info -->
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <x-heroicon-s-information-circle class="h-5 w-5 text-amber-400" />
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Invite-Only Mode
                        </h3>
                        <div class="mt-2 text-sm text-amber-700 dark:text-amber-300">
                            <ul class="list-disc list-inside space-y-1">
                                <li>Users need invitation codes to register</li>
                                <li>Non-invited users can join the waitlist</li>
                                <li>Admins can manage waitlist and send invitations</li>
                                <li>Provides controlled access to the platform</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Open Registration Info -->
            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <x-heroicon-s-information-circle class="h-5 w-5 text-green-400" />
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-green-800 dark:text-green-200">
                            Open Registration
                        </h3>
                        <div class="mt-2 text-sm text-green-700 dark:text-green-300">
                            <ul class="list-disc list-inside space-y-1">
                                <li>Anyone can register without restrictions</li>
                                <li>No invitation codes required</li>
                                <li>Faster user onboarding</li>
                                <li>Suitable for public launches</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-filament-panels::page>