<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ __('messages.emails.subjects.placement_question_answered', ['pet' => $petName]) }}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .quote { background: #E5F3FF; padding: 15px; border-radius: 6px; margin: 20px 0; font-style: italic; }
        .answer { background: #ECFDF5; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ __('messages.emails.placement_question_answered.title') }}</h1>
    </div>

    <div class="content">
        <p>{{ __('messages.emails.common.hello', ['name' => $askerName]) }}</p>

        <p>{{ __('messages.emails.placement_question_answered.intro', ['pet' => $petName]) }}</p>

        <p><strong>{{ __('messages.emails.placement_question_answered.your_question') }}</strong></p>
        <div class="quote">{{ $question }}</div>

        <p><strong>{{ __('messages.emails.placement_question_answered.the_answer') }}</strong></p>
        <div class="answer">{{ $answer }}</div>

        <p><a class="button" href="{{ $listingUrl }}">{{ __('messages.emails.placement_question_answered.button') }}</a></p>

        <div class="footer">
            <p>{{ __('messages.emails.placement_question_answered.one_off') }}</p>
        </div>
    </div>
</body>
</html>
