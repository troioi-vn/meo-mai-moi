<?php

// Compare every nested translation key against English without booting Laravel.
// Run from any directory: php utils/check-backend-i18n.php
function translationLeaves(array $translations, string $prefix = ''): array
{
    $leaves = [];
    foreach ($translations as $key => $value) {
        $path = $prefix === '' ? (string) $key : "$prefix.$key";
        if (is_array($value)) {
            $leaves += translationLeaves($value, $path);
        } else {
            $leaves[$path] = $value;
        }
    }

    return $leaves;
}

$root = dirname(__DIR__).'/backend/lang';
$total = 0;
foreach (['ru', 'uk', 'vi'] as $locale) {
    $missing = [];
    foreach (glob("$root/en/*.php") as $source) {
        $file = basename($source);
        $target = "$root/$locale/$file";
        $english = translationLeaves(require $source);
        $translated = is_file($target) ? translationLeaves(require $target) : [];
        foreach (array_diff_key($english, $translated) as $key => $value) {
            $missing[] = "$file:$key";
        }
    }
    echo "$locale: ".count($missing)." missing keys\n";
    foreach ($missing as $key) {
        echo "  $key\n";
    }
    $total += count($missing);
}
exit($total === 0 ? 0 : 1);
