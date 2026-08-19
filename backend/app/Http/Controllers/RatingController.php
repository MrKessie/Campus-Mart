<?php
namespace App\Http\Controllers;

use App\Models\Rating;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Http\Request;

class RatingController extends Controller {

    public function store(Request $request) {
        $request->validate([
            'listing_id' => 'required|exists:listings,id',
            'stars'      => 'required|integer|min:1|max:5',
            'review'     => 'nullable|string|max:500',
        ]);

        $listing = Listing::findOrFail($request->listing_id);

        if ($listing->user_id === $request->user()->id) {
            return response()->json(['message' => 'You cannot rate your own listing.'], 422);
        }

        $rating = Rating::updateOrCreate(
            ['buyer_id' => $request->user()->id, 'listing_id' => $request->listing_id],
            ['seller_id' => $listing->user_id, 'stars' => $request->stars, 'review' => $request->review]
        );

        return response()->json(['message' => 'Rating submitted.', 'rating' => $rating], 201);
    }

    public function sellerRatings(User $user) {
        $ratings = Rating::with('buyer')
            ->where('seller_id', $user->id)
            ->latest()
            ->paginate(10);

        return response()->json([
            'average_rating' => $user->average_rating,
            'rating_count'   => $user->rating_count,
            'ratings'        => $ratings,
        ]);
    }
}