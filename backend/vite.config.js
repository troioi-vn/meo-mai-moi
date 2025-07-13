import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['frontend/src/main.tsx'],
            refresh: true,
            buildDirectory: 'build',
            publicDirectory: 'public',
        }),
        tailwindcss(),
    ],
});