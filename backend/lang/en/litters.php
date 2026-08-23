<?php

declare(strict_types=1);

return [
    'default_name' => 'Litter, :date',
    'placeholders' => [
        'cat' => 'Kitten :number',
        'dog' => 'Puppy :number',
    ],
    'errors' => [
        'unsupported_type' => 'This pet type does not support litters.',
        'not_member' => 'This pet is not a member of the litter.',
    ],
];
