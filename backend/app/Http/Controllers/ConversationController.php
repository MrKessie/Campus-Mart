<?php
namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Listing;
use Illuminate\Http\Request;

class ConversationController extends Controller {

    public function index(Request $request) {
        $userId = $request->user()->id;
        $conversations = Conversation::with(['listing', 'buyer', 'seller', 'latestMessage'])
            ->withCount(['messages as unread_count' => function($query) use ($userId) {
                $query->where('sender_id', '!=', $userId)->whereNull('read_at');
            }])
            ->where('buyer_id', $userId)
            ->orWhere('seller_id', $userId)
            ->latest()
            ->get();

        return response()->json($conversations);
    }

    public function startOrGet(Request $request) {
        $request->validate([
            'listing_id' => 'required|exists:listings,id',
        ]);

        $listing = Listing::findOrFail($request->listing_id);

        if ($listing->user_id === $request->user()->id) {
            return response()->json(['message' => 'You cannot message yourself.'], 422);
        }

        $conversation = Conversation::firstOrCreate(
            [
                'listing_id' => $listing->id,
                'buyer_id'   => $request->user()->id,
                'seller_id'  => $listing->user_id,
            ]
        );

        return response()->json($conversation->load(['listing', 'buyer', 'seller']));
    }

    public function show(Request $request, Conversation $conversation) {
        $userId = $request->user()->id;
        if ($conversation->buyer_id !== $userId &&
            $conversation->seller_id !== $userId) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        // Mark incoming messages as read
        $conversation->messages()
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($conversation->load(['listing', 'buyer', 'seller', 'messages']));
    }

    public function setExchangeLocation(Request $request, Conversation $conversation) {
        $user = $request->user();
        if ($conversation->buyer_id !== $user->id &&
            $conversation->seller_id !== $user->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $request->validate([
            'exchange_location' => 'required|string|max:255',
        ]);

        $location = $request->exchange_location;

        if ($user->id === $conversation->buyer_id) {
            $conversation->buyer_proposed_location = $location;
        } else {
            $conversation->seller_proposed_location = $location;
        }

        $agreed = false;
        if ($conversation->buyer_proposed_location &&
            $conversation->seller_proposed_location &&
            $conversation->buyer_proposed_location === $conversation->seller_proposed_location) {
            $conversation->exchange_location = $location;
            $agreed = true;
        } else {
            $conversation->exchange_location = null;
        }

        $conversation->save();

        return response()->json([
            'agreed'       => $agreed,
            'message'      => $agreed
                ? 'Location agreed by both parties!'
                : 'Location proposed! Waiting for other party to confirm.',
            'conversation' => $conversation->load(['listing', 'buyer', 'seller']),
        ]);
    }
}