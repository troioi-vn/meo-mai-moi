<?php

declare(strict_types=1);

namespace App\Models\Concerns;

/**
 * Ensures translatable attributes are serialized as strings (using the current locale)
 * instead of full translation arrays when converting to JSON/array.
 *
 * This trait should be used alongside Spatie\Translatable\HasTranslations.
 */
trait SerializesTranslatableAsString
{
    /**
     * Convert the model instance to an array.
     * Overrides translatable attributes to return the current locale's translation
     * instead of the full translations array.
     */
    public function toArray(): array
    {
        $array = parent::toArray();

        // Replace translatable attributes with their current locale values
        foreach ($this->getTranslatableAttributes() as $attribute) {
            if (array_key_exists($attribute, $array)) {
                $array[$attribute] = $this->getTranslation($attribute, $this->getLocale());
            }
        }

        return $array;
    }
}
