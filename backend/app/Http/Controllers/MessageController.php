<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class MessageController extends Controller
{
    use ApiResponseTrait;

    #[OA\Post(
        path: "/api/messages",
        summary: "Send a new message",
        tags: ["Messages"],
        security: [["sanctum" => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["recipient_id", "content"],
                properties: [
                    new OA\Property(property: "recipient_id", type: "integer", example: 2),
                    new OA\Property(property: "content", type: "string", example: "Hello, how are you?"),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: "Message sent successfully",
                content: new OA\JsonContent(ref: "#/components/schemas/Message")
            ),
            new OA\Response(
                response: 422,
                description: "Validation error",
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: "message", type: "string", example: "Validation Error"),
                        new OA\Property(property: "errors", type: "object", example: ["recipient_id" => ["The recipient id field is required."]]),
                    ]
                )
            ),
            new OA\Response(
                response: 401,
                description: "Unauthenticated"
            ),
        ]
    )]
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'recipient_id' => 'required|exists:users,id',
            'content' => 'required|string',
        ]);

        $message = Message::create(array_merge($validatedData, [
            'sender_id' => $request->user()->id,
        ]));

        // Send notification to recipient
        \App\Models\Notification::create([
            'user_id' => $message->recipient_id,
            'message' => 'You have a new message from '.$request->user()->name,
            'link' => '/account/messages/'.$message->id,
        ]);

        return $this->sendSuccess($message, 201);
    }

    #[OA\Get(
        path: "/api/messages",
        summary: "Get all messages for the authenticated user",
        tags: ["Messages"],
        security: [["sanctum" => []]],
        responses: [
            new OA\Response(
                response: 200,
                description: "Successful operation",
                content: new OA\JsonContent(
                    type: "array",
                    items: new OA\Items(ref: "#/components/schemas/Message")
                )
            ),
            new OA\Response(
                response: 401,
                description: "Unauthenticated"
            ),
        ]
    )]
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $messages = Message::where('sender_id', $userId)
            ->orWhere('recipient_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->sendSuccess($messages);
    }

    #[OA\Get(
        path: "/api/messages/{id}",
        summary: "Get a single message by ID",
        tags: ["Messages"],
        security: [["sanctum" => []]],
        parameters: [
            new OA\Parameter(
                name: "id",
                in: "path",
                required: true,
                description: "ID of the message to retrieve",
                schema: new OA\Schema(type: "integer")
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: "Successful operation",
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: "data", ref: "#/components/schemas/Message")
                    ]
                )
            ),
            new OA\Response(
                response: 401,
                description: "Unauthenticated"
            ),
            new OA\Response(
                response: 403,
                description: "Forbidden: You are not the sender or recipient of this message."
            ),
            new OA\Response(
                response: 404,
                description: "Message not found"
            ),
        ]
    )]
    public function show(Request $request, Message $message)
    {
        if ($message->sender_id !== $request->user()->id && $message->recipient_id !== $request->user()->id) {
            return $this->sendError('Forbidden: You are not authorized to view this message.', 403);
        }

        if (is_null($message->read_at)) {
            $message->read_at = now();
            $message->save();
        }

        return $this->sendSuccess($message);
    }

    #[OA\Put(
        path: "/api/messages/{id}/read",
        summary: "Mark a message as read",
        tags: ["Messages"],
        security: [["sanctum" => []]],
        parameters: [
            new OA\Parameter(
                name: "id",
                in: "path",
                required: true,
                description: "ID of the message to mark as read",
                schema: new OA\Schema(type: "integer")
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: "Message marked as read successfully",
                content: new OA\JsonContent(ref: "#/components/schemas/Message")
            ),
            new OA\Response(
                response: 401,
                description: "Unauthenticated"
            ),
            new OA\Response(
                response: 403,
                description: "Forbidden: You are not the recipient of this message."
            ),
            new OA\Response(
                response: 404,
                description: "Message not found"
            ),
        ]
    )]
    public function markAsRead(Request $request, Message $message)
    {
        if ($message->recipient_id !== $request->user()->id) {
            return $this->sendError('Forbidden: You are not authorized to mark this message as read.', 403);
        }

        $message->read_at = now();
        $message->save();

        return $this->sendSuccess($message);
    }

    #[OA\Delete(
        path: "/api/messages/{id}",
        summary: "Delete a message",
        tags: ["Messages"],
        security: [["sanctum" => []]],
        parameters: [
            new OA\Parameter(
                name: "id",
                in: "path",
                required: true,
                description: "ID of the message to delete",
                schema: new OA\Schema(type: "integer")
            ),
        ],
        responses: [
            new OA\Response(
                response: 204,
                description: "Message deleted successfully"
            ),
            new OA\Response(
                response: 401,
                description: "Unauthenticated"
            ),
            new OA\Response(
                response: 403,
                description: "Forbidden: You are not the sender or recipient of this message."
            ),
            new OA\Response(
                response: 404,
                description: "Message not found"
            ),
        ]
    )]
    public function destroy(Request $request, Message $message)
    {
        if ($message->sender_id !== $request->user()->id && $message->recipient_id !== $request->user()->id) {
            return $this->sendError('Forbidden: You are not authorized to delete this message.', 403);
        }

        $message->delete();

        return $this->sendSuccess(null, 204);
    }
}