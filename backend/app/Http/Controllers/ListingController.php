<?php
namespace App\Http\Controllers;

use App\Models\Listing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ListingController extends Controller {

    public function index(Request $request) {
        $query = Listing::with(['user', 'category'])
            ->available()
            ->latest();

        if ($request->filled('search')) {
            $query->search($request->search);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        $listings = $query->paginate(15);
        return response()->json($listings);
    }

    public function store(Request $request) {
        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'title'       => 'required|string|max:150',
            'description' => 'required|string|max:2000',
            'price'       => 'required|numeric|min:0',
            'image'       => 'sometimes|image|max:4096',
            'images'      => 'sometimes|array',
            'images.*'    => 'image|max:4096',
            'is_service'  => 'sometimes|boolean',
            'course_code' => 'nullable|string|max:20',
        ]);

        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $imgFile) {
                $imagePaths[] = $imgFile->store('listings', 'public');
            }
        }

        $mainImage = !empty($imagePaths) ? $imagePaths[0] : null;
        if ($request->hasFile('image')) {
            $mainImage = $request->file('image')->store('listings', 'public');
            if (empty($imagePaths)) {
                $imagePaths[] = $mainImage;
            }
        }

        $listing = $request->user()->listings()->create([
            'category_id' => $request->category_id,
            'title'       => $request->title,
            'description' => $request->description,
            'price'       => $request->price,
            'image'       => $mainImage,
            'images'      => $imagePaths,
            'is_service'  => $request->boolean('is_service', false),
            'course_code' => $request->course_code ? strtoupper(trim($request->course_code)) : null,
        ]);

        return response()->json([
            'message' => 'Listing created successfully.',
            'listing' => $listing->load(['user', 'category']),
        ], 201);
    }

    public function show(Listing $listing) {
        return response()->json($listing->load(['user', 'category', 'ratings.buyer', 'offers.buyer']));
    }

    public function update(Request $request, Listing $listing) {
        if ($listing->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $request->validate([
            'category_id' => 'sometimes|exists:categories,id',
            'title'       => 'sometimes|string|max:150',
            'description' => 'sometimes|string|max:2000',
            'price'       => 'sometimes|numeric|min:0',
            'image'       => 'sometimes|image|max:4096',
            'images'      => 'sometimes|array',
            'images.*'    => 'image|max:4096',
            'status'      => 'sometimes|in:available,sold',
            'course_code' => 'nullable|string|max:20',
        ]);

        if ($request->hasFile('images')) {
            $newImages = [];
            foreach ($request->file('images') as $imgFile) {
                $newImages[] = $imgFile->store('listings', 'public');
            }
            if (!empty($newImages)) {
                $listing->images = $newImages;
                $listing->image = $newImages[0];
            }
        } elseif ($request->hasFile('image')) {
            if ($listing->image) Storage::disk('public')->delete($listing->image);
            $mainPath = $request->file('image')->store('listings', 'public');
            $listing->image = $mainPath;
            $listing->images = [$mainPath];
        }

        if ($request->has('course_code')) {
            $listing->course_code = $request->course_code ? strtoupper(trim($request->course_code)) : null;
        }

        $listing->fill($request->only('category_id', 'title', 'description', 'price', 'status'));
        $listing->save();

        return response()->json(['message' => 'Listing updated.', 'listing' => $listing]);
    }

    public function destroy(Request $request, Listing $listing) {
        if ($listing->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        if ($listing->image) Storage::disk('public')->delete($listing->image);
        $listing->delete();

        return response()->json(['message' => 'Listing deleted.']);
    }

    public function myListings(Request $request) {
        $listings = $request->user()
            ->listings()
            ->with('category')
            ->latest()
            ->paginate(15);

        return response()->json($listings);
    }

    public function toggleStatus(Request $request, Listing $listing) {
        if ($listing->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $listing->status = $listing->status === 'available' ? 'sold' : 'available';
        $listing->save();

        return response()->json(['message' => 'Status updated.', 'status' => $listing->status]);
    }
}