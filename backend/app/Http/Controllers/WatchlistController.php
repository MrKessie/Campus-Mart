<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;

class WatchlistController extends Controller {

    public function index(Request $request) {
        $listings = $request->user()
            ->watchlist()
            ->with(['category', 'user'])
            ->paginate(15);
        return response()->json($listings);
    }

    public function store(Request $request) {
        $request->validate(['listing_id' => 'required|exists:listings,id']);
        $request->user()->watchlist()->syncWithoutDetaching([$request->listing_id]);
        return response()->json(['message' => 'Listing saved to watchlist.']);
    }

    public function destroy(Request $request, $listingId) {
        $request->user()->watchlist()->detach($listingId);
        return response()->json(['message' => 'Listing removed from watchlist.']);
    }
}