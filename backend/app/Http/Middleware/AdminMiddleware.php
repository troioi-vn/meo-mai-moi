<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use App\Traits\ApiResponseTrait;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    use ApiResponseTrait;

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            /** @var User $user */
            $user = Auth::user();
            if (method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin'])) {
                return $next($request);
            }

            Log::notice('Admin route access denied for non-admin user.', [
                'user_id' => $user->id,
                'path' => $request->path(),
            ]);
        }

        return $this->sendError(__('messages.unauthorized'), 403);
    }
}
