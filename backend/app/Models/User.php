<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail {
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'profile_photo', 'phone', 'trust_score', 'trust_level'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
    ];

    public function listings() {
        return $this->hasMany(Listing::class);
    }

    public function ratingsReceived() {
        return $this->hasMany(Rating::class, 'seller_id');
    }

    public function watchlist() {
        return $this->belongsToMany(Listing::class, 'watchlist')->withTimestamps();
    }

    public function getAverageRatingAttribute(): float {
        return round($this->ratingsReceived()->avg('stars') ?? 0, 1);
    }

    public function getRatingCountAttribute(): int {
        return $this->ratingsReceived()->count();
    }

    public function getCompletedTransactionsAttribute(): int {
        return $this->listings()->where('status', 'sold')->count();
    }

    public function getTrustScoreAttribute(): int {
        $score = 0;

        // Verified email = 30 points base
        if ($this->email_verified_at) {
            $score += 30;
        }

        // Average rating = up to 40 points (rating/5 * 40)
        $avgRating = $this->ratingsReceived()->avg('stars') ?? 0;
        $score += round(($avgRating / 5) * 40);

        // Completed transactions = up to 30 points
        // 1 point per transaction, max 30
        $transactions = $this->completed_transactions;
        $score += min($transactions, 30);

        return min($score, 100);
    }

    public function getTrustLevelAttribute(): string {
        $score = $this->trust_score;
        if ($score >= 80) return 'Top Seller';
        if ($score >= 60) return 'Trusted Trader';
        if ($score >= 30) return 'Verified Student';
        return 'New Member';
    }
}