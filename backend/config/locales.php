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

    'supported' => ['en', 'vi', 'uk', 'ru'],

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
        'vi' => 'Tiếng Việt',
        'uk' => 'Українська',
        'ru' => 'Русский',
    ],

    /*
    |--------------------------------------------------------------------------
    | Open Graph Locales
    |--------------------------------------------------------------------------
    |
    | og:locale wants a language_TERRITORY pair, which a bare language code is
    | not. Facebook and the other preview crawlers ignore the tag outright when
    | it does not match one they know.
    |
    */

    'og' => [
        'en' => 'en_US',
        'vi' => 'vi_VN',
        'uk' => 'uk_UA',
        'ru' => 'ru_RU',
    ],

];
