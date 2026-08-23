<?php

declare(strict_types=1);

return [
    'default_name' => 'Помёт, :date',
    'placeholders' => [
        'cat' => 'Котёнок :number',
        'dog' => 'Щенок :number',
    ],
    'errors' => [
        'unsupported_type' => 'Этот тип питомца не поддерживает помёты.',
    ],
];
