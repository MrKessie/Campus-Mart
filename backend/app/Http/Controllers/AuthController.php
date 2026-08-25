<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller {

    public function register(Request $request) {
        $request->merge([
            'email' => strtolower(trim($request->email ?? ''))
        ]);

        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => [
                'required', 'email', 'unique:users,email',
                'regex:/^[a-zA-Z0-9._%+\-]+@uew\.edu\.gh$/'
            ],
            'password' => 'required|string|min:8|confirmed',
        ], [
            'email.regex' => 'Only UEW student email addresses (@uew.edu.gh) are allowed.',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => $request->password,
        ]);

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Registration successful. Please check your email to verify your account.',
        ], 201);
    }

    public function login(Request $request) {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $email = strtolower(trim($request->email));
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Please verify your email address before logging in.',
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token'   => $token,
            'user'    => $this->formatUser($user),
        ]);
    }

    public function logout(Request $request) {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request) {
        return response()->json($this->formatUser($request->user()));
    }

    public function updateProfile(Request $request) {
        $user = $request->user();

        $request->validate([
            'name'          => 'sometimes|string|max:255',
            'phone'         => 'sometimes|string|max:20',
            'profile_photo' => 'sometimes|image|max:2048',
        ]);

        if ($request->hasFile('profile_photo')) {
            $path = $request->file('profile_photo')->store('profiles', 'public');
            $user->profile_photo = $path;
        }

        $user->fill($request->only('name', 'phone'));
        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user'    => $this->formatUser($user),
        ]);
    }

    public function verifyEmail(Request $request, $id, $hash) {
        $user = User::findOrFail($id);

        if (!hash_equals((string) $hash,
            sha1($user->getEmailForVerification()))) {
            return response()->json(['message' => 'Invalid verification link.'], 403);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $user->markEmailAsVerified();

        return response()->json(['message' => 'Email verified successfully.']);
    }

    public function resendVerification(Request $request) {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification email resent.']);
    }

    private function formatUser($user): array {
        return [
            'id'                     => $user->id,
            'name'                   => $user->name,
            'email'                  => $user->email,
            'phone'                  => $user->phone,
            'profile_photo'          => $user->profile_photo,
            'average_rating'         => $user->average_rating,
            'rating_count'           => $user->rating_count,
            'completed_transactions' => $user->completed_transactions,
            'trust_score'            => $user->trust_score,
            'trust_level'            => $user->trust_level,
        ];
    }
}