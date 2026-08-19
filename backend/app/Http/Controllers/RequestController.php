<?php
namespace App\Http\Controllers;

use App\Models\StudentRequest;
use Illuminate\Http\Request;

class RequestController extends Controller {

    public function index(Request $request) {
        $query = StudentRequest::with(['user', 'category'])
            ->where('status', 'open')
            ->latest();

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        return response()->json($query->paginate(15));
    }

    public function store(Request $request) {
        $request->validate([
            'title'       => 'required|string|max:150',
            'description' => 'required|string|max:1000',
            'budget'      => 'nullable|numeric|min:0',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $studentRequest = StudentRequest::create([
            'user_id'     => $request->user()->id,
            'title'       => $request->title,
            'description' => $request->description,
            'budget'      => $request->budget,
            'category_id' => $request->category_id,
        ]);

        return response()->json([
            'message' => 'Request posted successfully.',
            'request' => $studentRequest->load(['user', 'category']),
        ], 201);
    }

    public function destroy(Request $request, StudentRequest $studentRequest) {
        if ($studentRequest->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $studentRequest->delete();
        return response()->json(['message' => 'Request deleted.']);
    }

    public function close(Request $request, StudentRequest $studentRequest) {
        if ($studentRequest->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $studentRequest->status = 'closed';
        $studentRequest->save();

        return response()->json(['message' => 'Request closed.', 'request' => $studentRequest]);
    }

    public function myRequests(Request $request) {
        $requests = StudentRequest::with(['category'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json($requests);
    }
}