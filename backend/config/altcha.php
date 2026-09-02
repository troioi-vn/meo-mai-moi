<?php

use AltchaOrg\Altcha\ChallengeOptions;

return [

    /*
     * The algorithm to use for hashing the challenge.
     * Should be SHA-256, SHA-384 or SHA-512.
     */
    'algorithm' => env('ALTCHA_ALGORITHM', 'SHA-256'),

    /*
     * The secret key to use for hashing the challenge.
     *
     * AltchaOrg\Altcha takes a non-nullable string, so leaving this unset does
     * not fail at boot - it throws a TypeError on the first challenge request
     * and the public Q&A stops accepting questions with a 500. Deriving a
     * stable fallback from APP_KEY means a deploy that forgets the variable
     * still works. Set ALTCHA_HMAC_KEY explicitly to rotate it independently.
     */
    'hmac_key' => env('ALTCHA_HMAC_KEY') ?: hash('sha256', 'altcha|'.(string) env('APP_KEY')),

    /*
     * The maximum value for the challenge.
     * The bigger larger the number, the more difficult the challenge.
     */
    'range_max' => env('ALTCHA_RANGE_MAX', ChallengeOptions::DEFAULT_MAX_NUMBER),

    /*
     * The expiration time for the challenge in seconds.
     * Set to null to disable expiration.
     */
    'expires' => env('ALTCHA_EXPIRES', 10),

    /*
     * The length of the salt to use for the challenge.
     */
    'salt_length' => env('ALTCHA_SALT_LENGTH', 12),

    /*
     * The route path to use for the challenge.
     * If you want to implement the logic yourself
     * set this to a null or empty value.
     */
    'route' => '/altcha-challenge',

    /*
     * The middleware to use for the challenge endpoint.
     */
    'middleware' => ['web', 'throttle:10,1'],

    /*
     * The value to use for bypass validation in tests.
     * If you want to bypass validation in tests, set this to the value of the challenge. e.g. 'valid'
     */
    'testing_bypass' => env('ALTCHA_TESTING_BYPASS'),
];
