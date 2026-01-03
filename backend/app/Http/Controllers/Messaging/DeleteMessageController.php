<?php

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class DeleteMessageController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, ChatMessage $message)
    {
        $this->authorize('delete', $message);

        $message->delete();

        return $this->sendSuccess(['message' => 'Message deleted successfully.']);
    }
}


