<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Domain failures in the public Q&A flow.
 *
 * Services must not reach for HttpResponseException, so everything the question
 * service needs to reject is expressed here and mapped to a status code at the
 * controller edge.
 */
class PlacementQuestionException extends Exception
{
    /** The listing is not open, so it is not accepting public questions. */
    public static function listingNotOpen(): self
    {
        return new self('listing_not_open');
    }

    /** The question is already published; approving it again is a no-op the caller should know about. */
    public static function alreadyPublished(): self
    {
        return new self('already_published');
    }

    /** Publishing requires answer text, or an explicit approve-without-answering. */
    public static function nothingToPublish(): self
    {
        return new self('nothing_to_publish');
    }

    /** The confirmation link is wrong, already used, or past its window. */
    public static function invalidConfirmationToken(): self
    {
        return new self('invalid_confirmation_token');
    }

    /** This listing already holds as many open questions as it will accept. */
    public static function tooManyPendingQuestions(): self
    {
        return new self('too_many_pending_questions');
    }
}
