<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Enums\ChatMessageType;
use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Messaging\StoreMessageRequest;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use OpenApi\Attributes as OA;

class StoreMessageController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    #[OA\Post(
        path: '/api/msg/chats/{id}/messages',
        summary: 'Send a message in a chat',
        tags: ['Messaging'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: [
                new OA\JsonContent(
                    required: ['content'],
                    properties: [
                        new OA\Property(property: 'content', type: 'string', example: 'Hello!'),
                        new OA\Property(property: 'type', type: 'string', enum: ['text', 'image'], default: 'text'),
                    ]
                ),
                new OA\MediaType(
                    mediaType: 'multipart/form-data',
                    schema: new OA\Schema(
                        properties: [
                            new OA\Property(property: 'type', type: 'string', enum: ['image'], example: 'image'),
                            new OA\Property(property: 'image', type: 'string', format: 'binary'),
                        ]
                    )
                ),
            ]
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Message sent',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [new OA\Property(property: 'data', ref: '#/components/schemas/ChatMessage')]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Chat not found'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function __invoke(StoreMessageRequest $request, Chat $chat)
    {
        $user = $request->user();

        $this->authorize('sendMessage', $chat);

        $validated = $request->validated();
        $type = $validated['type'];

        if ($type === 'image') {
            $content = $this->processImage($request, $chat->id);
            $messageType = ChatMessageType::IMAGE;
        } else {
            $content = $validated['content'];
            $messageType = ChatMessageType::TEXT;
        }

        $message = ChatMessage::create([
            'chat_id' => $chat->id,
            'sender_id' => $user->id,
            'type' => $messageType,
            'content' => $content,
        ]);

        // Update sender's last_read_at
        $chat->chatUsers()
            ->where('user_id', $user->id)
            ->update(['last_read_at' => now()]);

        // Notify other participants across enabled channels (in-app/email/telegram)
        $otherParticipants = $chat->activeParticipants()
            ->where('user_id', '!=', $user->id)
            ->get();

        $preview = $messageType === ChatMessageType::IMAGE
            ? '📷 '.__('messaging.image')
            : mb_substr($content, 0, 100);

        foreach ($otherParticipants as $participant) {
            /** @var User $participant */
            $this->notificationService->send(
                $participant,
                'new_message',
                [
                    'message' => $user->name.' sent you a message',
                    'link' => '/messages/'.$chat->id,
                    'chat_id' => $chat->id,
                    'sender_name' => $user->name,
                    'preview' => $preview,
                ]
            );
        }

        $message->load('sender:id,name,email');

        broadcast(new MessageSent($message))->toOthers();

        return $this->sendSuccess([
            'id' => $message->id,
            'chat_id' => $message->chat_id,
            'sender' => [
                'id' => $message->sender->id,
                'name' => $message->sender->name,
                'avatar_url' => $message->sender->avatar_url,
            ],
            'type' => $message->type->value,
            'content' => $message->content,
            'is_mine' => true,
            'created_at' => $message->created_at,
        ], 201);
    }

    private function processImage(Request $request, int $chatId): string
    {
        $file = $request->file('image');
        $manager = new ImageManager(new Driver);
        $image = $manager->read($file->getPathname());

        // Resize to max 1024x1024 keeping aspect ratio
        $image->scaleDown(1024, 1024);

        $filename = Str::uuid()->toString().'.jpg';
        $directory = "chat-images/{$chatId}";
        $path = "{$directory}/{$filename}";

        // Save as JPEG with quality 75 via configured filesystem
        $contents = $image->toJpeg(75)->toString();
        Storage::disk('public')->put($path, $contents);

        return Storage::disk('public')->url($path);
    }
}
