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
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Model
    |--------------------------------------------------------------------------
    */

    'default_model' => 'openai/gpt-4o-mini',

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
    | Use {text} as the placeholder for the content to translate.
    | Translation direction and target language belong in this template.
    |
    */

    'default_prompt_template' => <<<'PROMPT'
Translate the following text to Vietnamese. Return only the translated text, with no explanations or quotes.

{text}
PROMPT,

];
