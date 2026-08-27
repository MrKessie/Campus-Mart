<?php

namespace App\Http\Controllers;

use App\Models\EscrowTransaction;
use App\Models\Listing;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EscrowController extends Controller {

    public function myEscrows(Request $request) {
        $user = $request->user();

        $asBuyer = EscrowTransaction::with(['listing', 'seller'])
            ->where('buyer_id', $user->id)
            ->latest()
            ->get();

        $asSeller = EscrowTransaction::with(['listing', 'buyer'])
            ->where('seller_id', $user->id)
            ->latest()
            ->get();

        return response()->json([
            'as_buyer'  => $asBuyer,
            'as_seller' => $asSeller,
        ]);
    }

    public function initialize(Request $request) {
        $request->validate([
            'listing_id' => 'required|exists:listings,id',
            'amount'     => 'required|numeric|min:1',
        ]);

        $listing = Listing::findOrFail($request->listing_id);

        if ($listing->user_id === $request->user()->id) {
            return response()->json(['message' => 'You cannot purchase your own item.'], 422);
        }

        $reference = 'CM-ESC-' . strtoupper(Str::random(10));

        $escrow = EscrowTransaction::create([
            'listing_id'           => $listing->id,
            'buyer_id'             => $request->user()->id,
            'seller_id'            => $listing->user_id,
            'amount'               => $request->amount,
            'reference'            => $reference,
            'paystack_access_code' => 'ACC_' . strtoupper(Str::random(8)),
            'status'               => 'pending',
            'payment_method'       => 'mobile_money',
        ]);

        return response()->json([
            'message'              => 'Escrow transaction initialized.',
            'reference'            => $reference,
            'escrow'               => $escrow->load(['listing', 'seller']),
            'paystack_public_key'  => 'pk_test_c474927efd2bb2879ac5dace16988c8e75e2852a',
        ], 201);
    }

    public function verify(Request $request, $reference) {
        $escrow = EscrowTransaction::where('reference', $reference)->firstOrFail();

        if ($escrow->buyer_id !== $request->user()->id && $escrow->seller_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        // Simulate or verify Paystack response -> mark as held in escrow
        $escrow->status = 'held_in_escrow';
        $escrow->save();

        return response()->json([
            'message' => 'Payment received and held in safe Escrow!',
            'escrow'  => $escrow->load(['listing', 'buyer', 'seller']),
        ]);
    }

    public function release(Request $request, EscrowTransaction $escrow) {
        if ($escrow->buyer_id !== $request->user()->id) {
            return response()->json(['message' => 'Only the buyer can release escrow funds.'], 403);
        }

        if ($escrow->status !== 'held_in_escrow') {
            return response()->json(['message' => 'Escrow transaction is not in held status.'], 422);
        }

        $escrow->status = 'released';
        $escrow->save();

        // Increment seller trust score & level
        $seller = $escrow->seller;
        if ($seller) {
            $newScore = min(100, ($seller->trust_score ?? 50) + 10);
            $seller->trust_score = $newScore;
            if ($newScore >= 80) {
                $seller->trust_level = 'Trusted Seller ⭐';
            } elseif ($newScore >= 60) {
                $seller->trust_level = 'Verified Member';
            }
            $seller->save();
        }

        return response()->json([
            'message' => 'Payment successfully released to seller!',
            'escrow'  => $escrow->load(['listing', 'buyer', 'seller']),
        ]);
    }
}
