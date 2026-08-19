<?php
namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;

class MessageController extends Controller {

    public function index(Request $request, Conversation $conversation) {
        if ($conversation->buyer_id !== $request->user()->id &&
            $conversation->seller_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $messages = $conversation->messages()->with('sender')->latest()->get()->reverse()->values();

        return response()->json($messages);
    }

    public function store(Request $request, Conversation $conversation) {
        if ($conversation->buyer_id !== $request->user()->id &&
            $conversation->seller_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $request->validate([
            'body' => 'required|string|max:1000',
        ]);

        $message = $conversation->messages()->create([
            'sender_id' => $request->user()->id,
            'body'      => $request->body,
        ]);

        return response()->json($message->load('sender'), 201);
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