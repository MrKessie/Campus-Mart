<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Message extends Model {
    use HasFactory;

    protected $fillable = [
        'conversation_id', 'sender_id', 'body', 'image', 'read_at',
        'deleted_for_buyer', 'deleted_for_seller', 'is_deleted_for_everyone', 'reaction',
        'reply_to_message_id'
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'deleted_for_buyer' => 'boolean',
        'deleted_for_seller' => 'boolean',
        'is_deleted_for_everyone' => 'boolean',
    ];

    public function sender() {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function conversation() {
        return $this->belongsTo(Conversation::class);
    }

    public function replyTo() {
        return $this->belongsTo(Message::class, 'reply_to_message_id')->with('sender');
    }
}