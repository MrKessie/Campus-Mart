<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Models\Offer;
use App\Models\Conversation;
use Illuminate\Http\Request;

class OfferController extends Controller {

    public function store(Request $request, Listing $listing) {
        if ($listing->user_id === $request->user()->id) {
            return response()->json(['message' => 'You cannot make an offer on your own listing.'], 403);
        }

        $request->validate([
            'offer_price' => 'required|numeric|min:1',
            'message'     => 'nullable|string|max:500',
        ]);

        $offer = Offer::create([
            'listing_id'  => $listing->id,
            'buyer_id'    => $request->user()->id,
            'seller_id'   => $listing->user_id,
            'offer_price' => $request->offer_price,
            'message'     => $request->message,
            'status'      => 'pending',
        ]);

        // Auto-post into direct chat conversation
        $conversation = Conversation::firstOrCreate(
            [
                'listing_id' => $listing->id,
                'buyer_id'   => $request->user()->id,
                'seller_id'  => $listing->user_id,
            ]
        );

        $msgBody = "🏷️ New Price Offer: GH₵ {$request->offer_price}";
        if (!empty($request->message)) {
            $msgBody .= "\nNote: {$request->message}";
        }

        $conversation->messages()->create([
            'sender_id' => $request->user()->id,
            'body'      => $msgBody,
        ]);

        return response()->json([
            'message' => 'Offer submitted successfully.',
            'offer'   => $offer->load(['listing', 'buyer', 'seller']),
        ], 201);
    }

    public function myOffers(Request $request) {
        $userId = $request->user()->id;

        $sent = Offer::with(['listing', 'seller'])
            ->where('buyer_id', $userId)
            ->latest()
            ->get();

        $received = Offer::with(['listing', 'buyer'])
            ->where('seller_id', $userId)
            ->latest()
            ->get();

        return response()->json([
            'sent'     => $sent,
            'received' => $received,
        ]);
    }

    public function listingOffers(Request $request, Listing $listing) {
        $userId = $request->user()->id;

        if ($listing->user_id === $userId) {
            $offers = $listing->offers()->with('buyer')->latest()->get();
        } else {
            $offers = $listing->offers()->where('buyer_id', $userId)->with('seller')->latest()->get();
        }

        return response()->json($offers);
    }

    public function respond(Request $request, Offer $offer) {
        $userId = $request->user()->id;

        if ($offer->seller_id !== $userId && $offer->buyer_id !== $userId) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $request->validate([
            'status'        => 'required|in:accepted,declined,countered',
            'counter_price' => 'required_if:status,countered|nullable|numeric|min:1',
        ]);

        $offer->status = $request->status;
        if ($request->status === 'countered') {
            $offer->counter_price = $request->counter_price;
        }

        $offer->save();

        // Auto-post response into direct chat
        $conversation = Conversation::where('listing_id', $offer->listing_id)
            ->where('buyer_id', $offer->buyer_id)
            ->where('seller_id', $offer->seller_id)
            ->first();

        if ($conversation) {
            $statusText = strtoupper($request->status);
            $msgBody = "🏷️ Price Offer update: {$statusText} (GH₵ {$offer->offer_price})";
            if ($request->status === 'countered') {
                $msgBody .= "\nCounter Price: GH₵ {$request->counter_price}";
            }

            $conversation->messages()->create([
                'sender_id' => $request->user()->id,
                'body'      => $msgBody,
            ]);
        }

        return response()->json([
            'message' => 'Offer updated.',
            'offer'   => $offer->load(['listing', 'buyer', 'seller']),
        ]);
    }
}
