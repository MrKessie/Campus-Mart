<?php

namespace App\Http\Controllers;

use App\Models\SavedSearch;
use Illuminate\Http\Request;

class SavedSearchController extends Controller {

    public function index(Request $request) {
        $searches = SavedSearch::with('category')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json($searches);
    }

    public function store(Request $request) {
        $request->validate([
            'keyword'     => 'required|string|max:100',
            'category_id' => 'nullable|exists:categories,id',
            'max_price'   => 'nullable|numeric|min:0',
        ]);

        $search = SavedSearch::create([
            'user_id'     => $request->user()->id,
            'keyword'     => trim($request->keyword),
            'category_id' => $request->category_id,
            'max_price'   => $request->max_price,
        ]);

        return response()->json([
            'message' => 'Search alert saved successfully!',
            'search'  => $search->load('category'),
        ], 201);
    }

    public function destroy(Request $request, SavedSearch $savedSearch) {
        if ($savedSearch->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $savedSearch->delete();

        return response()->json(['message' => 'Search alert deleted.']);
    }
}
