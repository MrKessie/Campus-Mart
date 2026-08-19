<?php
namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Listing;
use Illuminate\Http\Request;

class ConversationController extends Controller {

    public function index(Request $request) {
        $conversations = Conversation::with(['listing', 'buyer', 'seller', 'messages'])
            ->where('buyer_id', $request->user()->id)
            ->orWhere('seller_id', $request->user()->id)
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
        if ($conversation->buyer_id !== $request->user()->id &&
            $conversation->seller_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        return response()->json($conversation->load(['listing', 'buyer', 'seller', 'messages']));
    }
}