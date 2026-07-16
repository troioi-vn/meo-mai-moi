<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Filament\Resources\ChatMessageResource;
use App\Filament\Resources\ChatResource;
use App\Filament\Resources\ChatResource\RelationManagers\MessagesRelationManager;
use App\Filament\Resources\ChatResource\RelationManagers\ParticipantsRelationManager;
use App\Filament\Resources\PlacementRequestResponseResource;
use App\Filament\Resources\TransferRequestResource;
use App\Models\ChatMessage;
use App\Models\PlacementRequestResponse;
use App\Models\TransferRequest;
use PHPUnit\Framework\TestCase;

class FilamentModerationResourcesTest extends TestCase
{
    public function test_chat_exposes_message_and_participant_moderation_relations(): void
    {
        $this->assertSame([
            MessagesRelationManager::class,
            ParticipantsRelationManager::class,
        ], ChatResource::getRelations());
    }

    public function test_message_resource_is_discoverable_but_not_editable_or_restorable(): void
    {
        $message = new ChatMessage;

        $this->assertTrue(ChatMessageResource::shouldRegisterNavigation());
        $this->assertFalse(ChatMessageResource::canCreate());
        $this->assertFalse(ChatMessageResource::canEdit($message));
        $this->assertFalse(ChatMessageResource::canForceDelete($message));
        $this->assertFalse(ChatMessageResource::canRestore($message));
    }

    public function test_placement_responses_and_transfers_are_read_only_resources(): void
    {
        $response = new PlacementRequestResponse;
        $transfer = new TransferRequest;

        $this->assertFalse(PlacementRequestResponseResource::canCreate());
        $this->assertFalse(PlacementRequestResponseResource::canEdit($response));
        $this->assertFalse(PlacementRequestResponseResource::canDelete($response));
        $this->assertFalse(PlacementRequestResponseResource::canForceDelete($response));
        $this->assertFalse(PlacementRequestResponseResource::canRestore($response));
        $this->assertFalse(TransferRequestResource::canCreate());
        $this->assertFalse(TransferRequestResource::canEdit($transfer));
        $this->assertFalse(TransferRequestResource::canDelete($transfer));
    }
}
