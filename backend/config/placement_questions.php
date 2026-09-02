<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Moderation Queue
    |--------------------------------------------------------------------------
    |
    | Nothing is public until someone entitled to act on the listing answers or
    | approves it, so an unbounded queue is a way to bury a rescue rather than a
    | way to publish spam. Questions past this many pending on one listing are
    | refused until the queue is worked down.
    |
    */

    'max_pending_per_listing' => (int) env('PLACEMENT_QUESTIONS_MAX_PENDING', 50),

    /*
    |--------------------------------------------------------------------------
    | Translation Budget
    |--------------------------------------------------------------------------
    |
    | Only answered pairs are ever translated, and only this many per pet. The
    | cap is per pet rather than per listing because Q&A survives relisting -
    | counting per listing would reset the budget every time an owner relists.
    | Pairs past the cap render untranslated with an on-demand control.
    |
    */

    'translated_pairs_per_pet' => (int) env('PLACEMENT_QUESTIONS_TRANSLATION_CAP', 20),

    /*
    |--------------------------------------------------------------------------
    | Asker Email Confirmation
    |--------------------------------------------------------------------------
    |
    | Confirmation gates delivery, never publication. An address that is not
    | confirmed inside this window is deleted: it will never be mailed and the
    | asker has no way to manage it, so retaining it serves nobody.
    |
    */

    'email_confirmation_ttl_hours' => (int) env('PLACEMENT_QUESTIONS_CONFIRM_TTL_HOURS', 48),

    /*
    |--------------------------------------------------------------------------
    | Enquiry Threads
    |--------------------------------------------------------------------------
    |
    | Public Q&A points people at the private chat for anything they do not want
    | published, so any signed-in user can now open one thread on a listing they
    | have no relationship with. This is the ceiling on that, per user per hour,
    | so the door cannot be used to flood a rescue's inbox.
    |
    */

    'enquiry_threads_per_hour' => (int) env('PLACEMENT_ENQUIRY_THREADS_PER_HOUR', 5),

    /*
    |--------------------------------------------------------------------------
    | Content Limits
    |--------------------------------------------------------------------------
    */

    'question_max_length' => 1000,
    'answer_max_length' => 2000,
    'asker_name_max_length' => 80,
];
