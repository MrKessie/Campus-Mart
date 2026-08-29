<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Conversation;

Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    $conversation = Conversation::find($conversationId);
    if (!$conversation) {
        return false;
    }
    return (int)$conversation->buyer_id === (int)$user->id || (int)$conversation->seller_id === (int)$user->id;
});

Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int)$user->id === (int)$userId;
});
