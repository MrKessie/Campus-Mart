<?phpuse App\Http\Controllers\RequestController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\RatingController;
use App\Http\Controllers\WatchlistController;

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

    Route::get('/conversations',           [ConversationController::class, 'index']);
    Route::post('/conversations',          [ConversationController::class, 'startOrGet']);
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);

    Route::get('/conversations/{conversation}/messages',  [MessageController::class, 'index']);
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);
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