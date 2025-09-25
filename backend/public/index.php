<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

/*
|--------------------------------------------------------------------------
| Check If The Application Is Under Maintenance
|--------------------------------------------------------------------------
|
| If the application is in maintenance / demo mode via the "down" command
| we will require this file so that any globally available callbacks or
| other system termination actions can be performed while the system
| is legitimately down in maintenance mode.
|
*/

if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

/*
|--------------------------------------------------------------------------
| Register The Auto Loader
|--------------------------------------------------------------------------
|
| We support a variety of PHP development environments, so we'll check
| if the composer autoloader is available here. If not, we'll make
| sure an error is displayed so they can install it.
|
|
| This script returns the application instance. The instance is given to
| the calling script so we can separate the building of the instances
| from the actual running of the application and sending responses.
|
*/

require __DIR__.'/../vendor/autoload.php';

/*
|--------------------------------------------------------------------------
| Run The Application
|--------------------------------------------------------------------------
|
| Once we have the application instance, we can handle the incoming
| request using the application's HTTP kernel. Then, we will send
| the response back to this client's browser, allowing them to
| enjoy the creative and wonderful applications we have built.
|
*/

$app = require_once __DIR__.'/../bootstrap/app.php';

$app->make(Illuminate\Contracts\Http\Kernel::class)->handle(
    $request = Illuminate\Http\Request::capture()
)->send();
