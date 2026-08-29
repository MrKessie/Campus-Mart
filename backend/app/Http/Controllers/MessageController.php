<?php
namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Events\MessageSent;
use App\Events\MessageDeleted;
use App\Events\MessageReacted;
use Illuminate\Http\Request;

class MessageController extends Controller {

    public function index(Request $request, Conversation $conversation) {
        $user = $request->user();
        if ($conversation->buyer_id !== $user->id &&
            $conversation->seller_id !== $user->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        // Mark incoming messages as read
        $conversation->messages()
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $query = $conversation->messages()->with(['sender', 'replyTo']);

        if ($user->id === $conversation->buyer_id) {
            $query->where('deleted_for_buyer', false);
        } else {
            $query->where('deleted_for_seller', false);
        }

        $messages = $query->latest()->get()->reverse()->values();

        return response()->json($messages);
    }

    public function store(Request $request, Conversation $conversation) {
        if ($conversation->buyer_id !== $request->user()->id &&
            $conversation->seller_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $request->validate([
            'body'                 => 'nullable|string|max:1000',
            'image'                => 'nullable|image|max:4096',
            'reply_to_message_id' => 'nullable|exists:messages,id',
        ]);

        if (empty($request->body) && !$request->hasFile('image')) {
            return response()->json(['message' => 'Message body or image is required.'], 422);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('chat_images', 'public');
        }

        $message = $conversation->messages()->create([
            'sender_id'           => $request->user()->id,
            'body'                => $request->body ?? '',
            'image'               => $imagePath,
            'reply_to_message_id' => $request->reply_to_message_id,
        ]);

        $loadedMessage = $message->load(['sender', 'replyTo']);

        // Broadcast real-time message event to channel
        try {
            broadcast(new MessageSent($loadedMessage))->toOthers();
        } catch (\Throwable $e) {
            \Log::warning('Broadcast MessageSent failed: ' . $e->getMessage());
        }

        return response()->json($loadedMessage, 201);
    }

    public function destroy(Request $request, Message $message) {
        $user = $request->user();
        $conversation = $message->conversation;

        if ($conversation->buyer_id !== $user->id && $conversation->seller_id !== $user->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $type = $request->input('type', 'me');

        if ($type === 'everyone') {
            if ($message->sender_id !== $user->id) {
                return response()->json(['message' => 'You can only delete your own messages for everyone.'], 403);
            }
            $message->is_deleted_for_everyone = true;
            $message->body = '';
            $message->image = null;
            $message->save();

            try {
                broadcast(new MessageDeleted($message))->toOthers();
            } catch (\Throwable $e) {
                \Log::warning('Broadcast MessageDeleted failed: ' . $e->getMessage());
            }
        } else {
            if ($user->id === $conversation->buyer_id) {
                $message->deleted_for_buyer = true;
            } else {
                $message->deleted_for_seller = true;
            }
            $message->save();
        }

        return response()->json(['message' => 'Message deleted.', 'message_data' => $message]);
    }

    public function react(Request $request, Message $message) {
        $user = $request->user();
        $conversation = $message->conversation;

        if ($conversation->buyer_id !== $user->id && $conversation->seller_id !== $user->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $request->validate([
            'reaction' => 'nullable|string|max:10',
        ]);

        $message->reaction = $request->reaction;
        $message->save();

        try {
            broadcast(new MessageReacted($message))->toOthers();
        } catch (\Throwable $e) {
            \Log::warning('Broadcast MessageReacted failed: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Reaction updated.', 'message_data' => $message]);
    }

    public function unreadCount(Request $request) {
        $count = Message::whereHas('conversation', function($q) use ($request) {
            $q->where('buyer_id', $request->user()->id)
              ->orWhere('seller_id', $request->user()->id);
        })
        ->where('sender_id', '!=', $request->user()->id)
        ->whereNull('read_at')
        ->count();

        return response()->json(['count' => $count]);
    }
}