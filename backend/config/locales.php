<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Supported Locales
    |--------------------------------------------------------------------------
    |
    | The list of locales that the application supports. This is used by
    | the SetLocaleMiddleware and LocaleController to validate and set
    | the application locale.
    |
    | To add a new language:
    | 1. Add the locale code to this array
    | 2. Create translation files in lang/{locale}/
    | 3. Create frontend translations in frontend/src/i18n/locales/{locale}/
    |
    */

    'supported' => ['en', 'ru', 'vi'],

    /*
    |--------------------------------------------------------------------------
    | Locale Names
    |--------------------------------------------------------------------------
    |
    | Human-readable names for each supported locale. Used for display
    | purposes in the UI (e.g., language switcher).
    |
    */

    'names' => [
        'en' => 'English',
        'ru' => 'Русский',
        'vi' => 'Tiếng Việt',
    ],

];
