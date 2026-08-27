<?php

use App\Http\Controllers\RequestController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\RatingController;
use App\Http\Controllers\WatchlistController;
use App\Http\Controllers\OfferController;
use App\Http\Controllers\SavedSearchController;
use App\Http\Controllers\EscrowController;
use App\Http\Controllers\AppointmentController;

// Public routes
Route::post('/register',       [AuthController::class, 'register']);
Route::post('/login',          [AuthController::class, 'login']);
Route::get('/categories',      [CategoryController::class, 'index']);
Route::get('/listings',        [ListingController::class, 'index']);
Route::get('/listings/{listing}', [ListingController::class, 'show']);
Route::get('/users/{user}/ratings', [RatingController::class, 'sellerRatings']);

Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed'])
    ->name('verification.verify');

Route::post('/email/resend', [AuthController::class, 'resendVerification'])
    ->middleware(['throttle:6,1']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout',      [AuthController::class, 'logout']);
    Route::get('/me',           [AuthController::class, 'me']);
    Route::put('/me',           [AuthController::class, 'updateProfile']);

    Route::post('/listings',               [ListingController::class, 'store']);
    Route::post('/listings/{listing}',     [ListingController::class, 'update']);
    Route::delete('/listings/{listing}',   [ListingController::class, 'destroy']);
    Route::get('/my-listings',             [ListingController::class, 'myListings']);
    Route::post('/listings/{listing}/toggle-status', [ListingController::class, 'toggleStatus']);

    // Offers & Negotiations
    Route::post('/listings/{listing}/offers',      [OfferController::class, 'store']);
    Route::get('/listings/{listing}/offers',       [OfferController::class, 'listingOffers']);
    Route::get('/my-offers',                       [OfferController::class, 'myOffers']);
    Route::post('/offers/{offer}/respond',         [OfferController::class, 'respond']);

    // Saved Search Alerts
    Route::get('/saved-searches',                  [SavedSearchController::class, 'index']);
    Route::post('/saved-searches',                 [SavedSearchController::class, 'store']);
    Route::delete('/saved-searches/{savedSearch}', [SavedSearchController::class, 'destroy']);

    // MoMo Escrow Payments (Paystack)
    Route::get('/my-escrows',                      [EscrowController::class, 'myEscrows']);
    Route::post('/escrow/initialize',              [EscrowController::class, 'initialize']);
    Route::post('/escrow/verify/{reference}',      [EscrowController::class, 'verify']);
    Route::post('/escrow/{escrow}/release',        [EscrowController::class, 'release']);

    // Service Appointment Bookings
    Route::get('/my-appointments',                 [AppointmentController::class, 'myAppointments']);
    Route::post('/listings/{listing}/appointments', [AppointmentController::class, 'store']);
    Route::post('/appointments/{appointment}/status', [AppointmentController::class, 'updateStatus']);

    Route::get('/conversations',           [ConversationController::class, 'index']);
    Route::post('/conversations',          [ConversationController::class, 'startOrGet']);
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
    Route::post('/conversations/{conversation}/exchange-location', [ConversationController::class, 'setExchangeLocation']);

    Route::get('/conversations/{conversation}/messages',  [MessageController::class, 'index']);
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);
    Route::delete('/messages/{message}',                  [MessageController::class, 'destroy']);
    Route::post('/messages/{message}/react',              [MessageController::class, 'react']);
    Route::get('/unread-count',            [MessageController::class, 'unreadCount']);

    Route::post('/ratings',                [RatingController::class, 'store']);

    Route::get('/watchlist',               [WatchlistController::class, 'index']);
    Route::post('/watchlist',              [WatchlistController::class, 'store']);
    Route::delete('/watchlist/{listingId}',[WatchlistController::class, 'destroy']);

    // Request Board
    Route::get('/requests',                    [RequestController::class, 'index']);
    Route::post('/requests',                   [RequestController::class, 'store']);
    Route::delete('/requests/{studentRequest}',[RequestController::class, 'destroy']);
    Route::post('/requests/{studentRequest}/close', [RequestController::class, 'close']);
    Route::get('/my-requests',                 [RequestController::class, 'myRequests']);
});