<?php
namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageReacted implements ShouldBroadcastNow {
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $messageId;
    public $conversationId;
    public $reaction;

    public function __construct(Message $message) {
        $this->messageId = $message->id;
        $this->conversationId = $message->conversation_id;
        $this->reaction = $message->reaction;
    }

    public function broadcastOn() {
        return new PrivateChannel('conversation.' . $this->conversationId);
    }

    public function broadcastAs() {
        return 'MessageReacted';
    }

    public function broadcastWith() {
        return [
            'message_id'      => $this->messageId,
            'conversation_id' => $this->conversationId,
            'reaction'        => $this->reaction,
        ];
    }
}
