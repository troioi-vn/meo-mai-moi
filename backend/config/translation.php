<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Settings Keys
    |--------------------------------------------------------------------------
    |
    | Keys used in the settings table for admin-managed translation config.
    |
    */

    'settings' => [
        'api_key' => 'translation.openrouter_api_key',
        'model' => 'translation.model',
        'prompt_template' => 'translation.prompt_template',
        'source_language' => 'translation.source_language',
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Model
    |--------------------------------------------------------------------------
    */

    'default_model' => 'openai/gpt-4o-mini',

    'default_source_language' => 'en',

    /*
    |--------------------------------------------------------------------------
    | Available Models
    |--------------------------------------------------------------------------
    |
    | Curated OpenRouter model slugs for the admin dropdown.
    |
    */

    'models' => [
        'openai/gpt-4o' => 'GPT-4o',
        'openai/gpt-4o-mini' => 'GPT-4o Mini',
        'anthropic/claude-3.5-sonnet' => 'Claude 3.5 Sonnet',
        'google/gemini-2.0-flash-001' => 'Gemini 2.0 Flash',
        'deepseek/deepseek-chat-v3-0324' => 'DeepSeek V3',
        'z-ai/glm-4.5' => 'GLM 4.5',
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Prompt Template
    |--------------------------------------------------------------------------
    |
    | Use {text} for the content to translate and {source_language} for the
    | human-readable name of the selected source language.
    |
    */

    'default_prompt_template' => <<<'PROMPT'
You are a precise, professional translator.
Task: Translate the input text into the 3 other languages from our supported list: English (en), Vietnamese (vi), Russian (ru), and Ukrainian (uk). The input text is in {source_language}.
Constraints:
- Return ONLY the translations wrapped in the correct ISO language tags.
- Preserve the original formatting, including line breaks, emojis, etc.
- Do not include markdown code blocks (```), introductions, or extra commentary.
Input Text:
{text}
PROMPT,

    /*
    |--------------------------------------------------------------------------
    | Default Test Text
    |--------------------------------------------------------------------------
    |
    | Sample text pre-filled in the admin test form on first load.
    |
    */

    'default_test_text' => 'This cat is locking for a permanent home. She is very friendly and loves to play. Litter box pro! Please help her find a loving family.',

];
