<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\ErrorEvent;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use JsonException;

class ReportErrorsCommand extends Command
{
    protected $signature = 'errors:report
        {--since=24h : Relative time window such as 90m, 24h, or 7d}
        {--source= : Filter by frontend or backend}
        {--limit=50 : Maximum fingerprint groups to return (1-500)}
        {--json : Emit a stable machine-readable JSON document}';

    protected $description = 'Report runtime errors grouped by fingerprint';

    public function handle(): int
    {
        $since = (string) $this->option('since');
        $source = $this->option('source');
        $source = is_string($source) && $source !== '' ? $source : null;
        $limit = filter_var($this->option('limit'), FILTER_VALIDATE_INT);
        $sinceAt = $this->parseSince($since);

        if ($sinceAt === null) {
            $this->components->error('The --since value must use a positive integer followed by m, h, or d (for example: 90m, 24h, 7d).');

            return self::INVALID;
        }

        if ($source !== null && ! in_array($source, ['frontend', 'backend'], true)) {
            $this->components->error('The --source value must be frontend or backend.');

            return self::INVALID;
        }

        if ($limit === false || $limit < 1 || $limit > 500) {
            $this->components->error('The --limit value must be between 1 and 500.');

            return self::INVALID;
        }

        $groups = $this->groups($sinceAt, $source, $limit);
        $report = [
            'schema_version' => 1,
            'generated_at' => now()->toIso8601String(),
            'filters' => [
                'since' => $since,
                'since_at' => $sinceAt->toIso8601String(),
                'source' => $source,
                'limit' => $limit,
            ],
            'group_count' => count($groups),
            'groups' => $groups,
        ];

        if ((bool) $this->option('json')) {
            try {
                $this->output->writeln(json_encode($report, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
            } catch (JsonException $exception) {
                $this->components->error('The error report could not be encoded as JSON: '.$exception->getMessage());

                return self::FAILURE;
            }

            return self::SUCCESS;
        }

        $this->components->info(sprintf(
            'Runtime errors since %s (%d fingerprint groups)',
            $sinceAt->toIso8601String(),
            count($groups),
        ));

        $this->table(
            ['Count', 'First seen', 'Last seen', 'Sources', 'Versions', 'Route', 'Sample message', 'Fingerprint'],
            array_map(fn (array $group): array => [
                $group['count'],
                $group['first_seen'],
                $group['last_seen'],
                implode(', ', $group['sources']),
                implode(', ', $group['app_versions']),
                $group['sample']['route'],
                $group['sample']['message'],
                $group['fingerprint'],
            ], $groups),
        );

        return self::SUCCESS;
    }

    private function parseSince(string $value): ?Carbon
    {
        if (preg_match('/^(?<amount>[1-9]\d*)(?<unit>[mhd])$/', $value, $matches) !== 1) {
            return null;
        }

        $amount = (int) $matches['amount'];

        return match ($matches['unit']) {
            'm' => now()->subMinutes($amount),
            'h' => now()->subHours($amount),
            'd' => now()->subDays($amount),
        };
    }

    /**
     * @return list<array{fingerprint: string, count: int, first_seen: string, last_seen: string, sources: list<string>, app_versions: list<string>, sample: array{message: string, exception_class: ?string, route: string, method: ?string, status_code: ?int}}>
     */
    private function groups(Carbon $sinceAt, ?string $source, int $limit): array
    {
        $baseQuery = ErrorEvent::query()
            ->where('occurred_at', '>=', $sinceAt)
            ->when($source !== null, fn (Builder $query): Builder => $query->where('source', $source));

        $aggregates = (clone $baseQuery)
            ->select('fingerprint')
            ->selectRaw('COUNT(*) AS occurrence_count')
            ->selectRaw('MIN(occurred_at) AS first_seen')
            ->selectRaw('MAX(occurred_at) AS last_seen')
            ->selectRaw('jsonb_agg(DISTINCT source ORDER BY source) AS sources')
            ->selectRaw("COALESCE(jsonb_agg(DISTINCT app_version ORDER BY app_version) FILTER (WHERE app_version IS NOT NULL), '[]'::jsonb) AS app_versions")
            ->groupBy('fingerprint')
            ->orderByDesc('occurrence_count')
            ->orderByDesc('last_seen')
            ->limit($limit)
            ->get();

        $fingerprints = $aggregates->pluck('fingerprint')->filter(fn (mixed $value): bool => is_string($value))->values()->all();
        $samples = $fingerprints === []
            ? collect()
            : (clone $baseQuery)
                ->whereIn('fingerprint', $fingerprints)
                ->selectRaw('DISTINCT ON (fingerprint) fingerprint, message, exception_class, route, method, status_code')
                ->orderBy('fingerprint')
                ->orderByDesc('occurred_at')
                ->get()
                ->keyBy('fingerprint');

        return $aggregates->map(function (ErrorEvent $aggregate) use ($samples): array {
            /** @var ErrorEvent $sample */
            $sample = $samples->get($aggregate->fingerprint);

            return [
                'fingerprint' => $aggregate->fingerprint,
                'count' => (int) $aggregate->getAttribute('occurrence_count'),
                'first_seen' => Carbon::parse((string) $aggregate->getAttribute('first_seen'))->toIso8601String(),
                'last_seen' => Carbon::parse((string) $aggregate->getAttribute('last_seen'))->toIso8601String(),
                'sources' => $this->decodeJsonList($aggregate->getAttribute('sources')),
                'app_versions' => $this->decodeJsonList($aggregate->getAttribute('app_versions')),
                'sample' => [
                    'message' => $sample->message,
                    'exception_class' => $sample->exception_class,
                    'route' => $sample->route,
                    'method' => $sample->method,
                    'status_code' => $sample->status_code,
                ],
            ];
        })->values()->all();
    }

    /** @return list<string> */
    private function decodeJsonList(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter($value, 'is_string'));
        }

        if (! is_string($value)) {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? array_values(array_filter($decoded, 'is_string')) : [];
    }
}
