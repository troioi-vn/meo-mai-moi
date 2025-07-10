<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(append: [
            Illuminate\Http\Middleware\HandleCors::class,
        ]);

        $middleware->web([
            // No global exclusions here. Manage middleware per route or in Kernel.php if needed.
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
