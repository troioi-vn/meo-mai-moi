<?php

namespace App\Services\Notifications;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Log;
use League\CommonMark\CommonMarkConverter;

class NotificationTemplateRenderer
{
    public function __construct(
        private ?CommonMarkConverter $markdown = null
    ) {
        if ($this->markdown === null && class_exists(CommonMarkConverter::class)) {
            $this->markdown = new CommonMarkConverter;
        }
    }

    /**
     * Render a template payload for a given channel.
     * Returns [subject, html] for email, or [title, message, link] for in_app (title/message may be inferred from body/frontmatter later).
     */
    public function render(array $template, array $data, string $channel): array
    {
        $engine = $template['engine'] ?? 'blade';
        $body = $template['body'] ?? '';
        $subject = $template['subject'] ?? null;

        if ($channel === 'email') {
            $html = $this->renderBody($engine, $body, $data);
            $subjectOut = $subject ? $this->renderInline($subject, $data) : null;

            return ['subject' => $subjectOut, 'html' => $html];
        }

        if ($channel === 'in_app') {
            // For now, treat full body as message; title can be derived or left null.
            $rendered = $this->renderBody($engine, $body, $data);
            $plain = $this->toPlainText($rendered);
            $link = $data['link'] ?? ($data['actionUrl'] ?? null);

            return ['title' => $data['title'] ?? null, 'message' => $plain, 'link' => $link];
        }

        return [];
    }

    private function renderBody(string $engine, string $body, array $data): string
    {
        try {
            return match ($engine) {
                'blade' => Blade::render($body, $data),
                'markdown' => $this->renderMarkdown($body, $data),
                default => e($body),
            };
        } catch (\Throwable $e) {
            Log::error('Template rendering failed', ['error' => $e->getMessage()]);

            return e($body);
        }
    }

    private function renderMarkdown(string $body, array $data): string
    {
        // First, run Blade interpolation to support {{ }} in .md files
        try {
            $interpolated = Blade::render($body, $data);
        } catch (\Throwable $e) {
            $interpolated = $body; // fallback
        }

        // Then convert Markdown to HTML (if converter available), else escape
        if ($this->markdown) {
            try {
                return $this->markdown->convert($interpolated)->getContent();
            } catch (\Throwable $e) {
                Log::debug('Markdown conversion failed; returning escaped content', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return e($interpolated);
    }

    private function renderInline(string $template, array $data): string
    {
        // Use Blade inline rendering for subject lines as well
        try {
            return Blade::render($template, $data);
        } catch (\Throwable $e) {
            return $template;
        }
    }

    private function toPlainText(string $html): string
    {
        // naive plain-text conversion; frontend can format appropriately
        return trim(strip_tags($html));
    }
}
