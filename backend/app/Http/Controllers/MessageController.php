<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="Message",
 *     title="Message",
 *     description="Message model",
 *     @OA\Property(
 *         property="id",
 *         type="integer",
 *         format="int64",
 *         description="Message ID"
 *     ),
 *     @OA\Property(
 *         property="sender_id",
 *         type="integer",
 *         format="int64",
 *         description="ID of the user who sent the message"
 *     ),
 *     @OA\Property(
 *         property="recipient_id",
 *         type="integer",
 *         format="int64",
 *         description="ID of the user who received the message"
 *     ),
 *     @OA\Property(
 *         property="content",
 *         type="string",
 *         description="Content of the message"
 *     ),
 *     @OA\Property(
 *         property="read_at",
 *         type="string",
 *         format="date-time",
 *         nullable=true,
 *         description="Timestamp when the message was read"
 *     ),
 *     @OA\Property(
 *         property="created_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of message creation"
 *     ),
 *     @OA\Property(
 *         property="updated_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of last message update"
 *     )
 * )
 */
class MessageController extends Controller
{
    use ApiResponseTrait;

    /**
     * @OA\Post(
     *     path="/api/messages",
     *     summary="Send a new message",
     *     tags={"Messages"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"recipient_id", "content"},
     *             @OA\Property(property="recipient_id", type="integer", example=2),
     *             @OA\Property(property="content", type="string", example="Hello, how are you?")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Message sent successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Message")
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Validation Error"),
     *             @OA\Property(property="errors", type="object", example={"recipient_id": {"The recipient id field is required."}})
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
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
            'message' => 'You have a new message from ' . $request->user()->name,
            'link' => '/account/messages/' . $message->id,
            'is_read' => false,
        ]);

        return $this->sendSuccess($message, 201);
    }

    /**
     * @OA\Get(
     *     path="/api/messages",
     *     summary="Get all messages for the authenticated user",
     *     tags={"Messages"},
     *     security={{"sanctum": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(ref="#/components/schemas/Message")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $messages = Message::where('sender_id', $userId)
            ->orWhere('recipient_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->sendSuccess($messages);
    }

    /**
     * @OA\Get(
     *     path="/api/messages/{id}",
     *     summary="Get a single message by ID",
     *     tags={"Messages"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the message to retrieve",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(ref="#/components/schemas/Message")
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden: You are not the sender or recipient of this message."
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Message not found"
     *     )
     * )
     */
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

    /**
     * @OA\Put(
     *     path="/api/messages/{id}/read",
     *     summary="Mark a message as read",
     *     tags={"Messages"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the message to mark as read",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Message marked as read successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Message")
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden: You are not the recipient of this message."
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Message not found"
     *     )
     * )
     */
    public function markAsRead(Request $request, Message $message)
    {
        if ($message->recipient_id !== $request->user()->id) {
            return $this->sendError('Forbidden: You are not authorized to mark this message as read.', 403);
        }

        $message->read_at = now();
        $message->save();

        return $this->sendSuccess($message);
    }

    /**
     * @OA\Delete(
     *     path="/api/messages/{id}",
     *     summary="Delete a message",
     *     tags={"Messages"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the message to delete",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=204,
     *         description="Message deleted successfully"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden: You are not the sender or recipient of this message."
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Message not found"
     *     )
     * )
     */
    public function destroy(Request $request, Message $message)
    {
        if ($message->sender_id !== $request->user()->id && $message->recipient_id !== $request->user()->id) {
            return $this->sendError('Forbidden: You are not authorized to delete this message.', 403);
        }

        $message->delete();

        return $this->sendSuccess(null, 204);
    }
}
