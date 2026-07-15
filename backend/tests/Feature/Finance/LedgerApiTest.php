<?php

declare(strict_types=1);

namespace Tests\Feature\Finance;

use App\Enums\ResourceInvitationStatus;
use App\Models\LedgerTransactionHealthLink;
use App\Models\PetRelationship;
use App\Models\PetType;
use App\Models\User;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\PetTypeSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

class LedgerApiTest extends TestCase
{
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CurrencySeeder::class);
        $this->seed(PetTypeSeeder::class);
        $this->user = User::factory()->create();
    }

    public function test_onboarding_creates_membership_cash_and_localized_categories_atomically(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'My cats', 'currency_code' => 'VND']);

        $response->assertCreated()->assertJsonPath('success', true)->assertJsonPath('data.title', 'My cats')->assertJsonPath('data.currency.minor_units', 0);
        $ledgerId = $response->json('data.id');
        $this->assertDatabaseHas('ledger_memberships', ['ledger_id' => $ledgerId, 'user_id' => $this->user->id, 'end_at' => null]);
        $this->assertDatabaseHas('ledger_accounts', ['ledger_id' => $ledgerId, 'name' => 'Cash']);
        $this->assertDatabaseCount('ledger_categories', 10);
    }

    public function test_transactions_use_positive_minor_units_and_lock_currency_even_after_deletion(): void
    {
        $ledger = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'Personal', 'currency_code' => 'USD'])->json('data');
        $account = $this->getJson("/api/ledgers/{$ledger['id']}/accounts")->json('data.0');
        $category = collect($this->getJson("/api/ledgers/{$ledger['id']}/categories")->json('data'))->firstWhere('applies_to', 'expense');

        $transaction = $this->postJson("/api/ledgers/{$ledger['id']}/transactions", ['type' => 'expense', 'amount' => '12.50', 'occurred_on' => '2026-07-15', 'account_id' => $account['id'], 'category_id' => $category['id']]);
        $transaction->assertCreated()->assertJsonPath('data.amount_minor', 1250);
        $this->getJson("/api/ledgers/{$ledger['id']}/dashboard")->assertOk()->assertJsonPath('data.current_month.expense', 1250)->assertJsonCount(6, 'data.monthly_trend');
        $this->deleteJson("/api/ledgers/{$ledger['id']}/transactions/{$transaction->json('data.id')}")->assertNoContent();
        $this->putJson("/api/ledgers/{$ledger['id']}", ['currency_code' => 'VND'])->assertUnprocessable()->assertJsonPath('success', false);
    }

    public function test_last_member_cannot_leave_and_archived_ledger_rejects_mutations(): void
    {
        $ledger = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'Shared', 'currency_code' => 'VND'])->json('data');
        $this->postJson("/api/ledgers/{$ledger['id']}/leave")->assertUnprocessable();
        $this->postJson("/api/ledgers/{$ledger['id']}/archive")->assertOk();
        $this->postJson("/api/ledgers/{$ledger['id']}/accounts", ['name' => 'Bank'])->assertForbidden();
        $this->getJson("/api/ledgers/{$ledger['id']}")->assertOk();
    }

    public function test_shared_invitation_adds_an_equal_member_through_the_generic_flow(): void
    {
        $ledger = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'Rescue', 'currency_code' => 'VND'])->json('data');
        $token = $this->postJson("/api/ledgers/{$ledger['id']}/invitations")->assertCreated()->json('data.invitation.token');
        $recipient = User::factory()->create();
        $this->actingAs($recipient)->postJson("/api/resource-invitations/{$token}/accept")->assertOk()->assertJsonPath('data.type', 'ledger')->assertJsonPath('data.destination', '/finance');
        $this->assertDatabaseHas('ledger_memberships', ['ledger_id' => $ledger['id'], 'user_id' => $recipient->id, 'end_at' => null]);
    }

    public function test_deleting_an_empty_ledger_revokes_its_pending_invitations(): void
    {
        $ledger = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'Temporary', 'currency_code' => 'VND'])->json('data');
        $invitation = $this->postJson("/api/ledgers/{$ledger['id']}/invitations")->assertCreated()->json('data.invitation');

        $this->deleteJson("/api/ledgers/{$ledger['id']}")->assertNoContent();

        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation['id'],
            'status' => ResourceInvitationStatus::REVOKED->value,
        ]);
    }

    public function test_medical_record_and_expense_are_created_atomically_and_deletion_requires_a_choice(): void
    {
        $pet = $this->createPetWithOwner($this->user, ['pet_type_id' => PetType::query()->where('slug', 'cat')->value('id')]);
        $ledger = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'Care', 'currency_code' => 'VND'])->json('data');
        $account = $this->getJson("/api/ledgers/{$ledger['id']}/accounts")->json('data.0');
        $category = collect($this->getJson("/api/ledgers/{$ledger['id']}/categories")->json('data'))->firstWhere('name', 'Medical');
        $record = $this->postJson("/api/pets/{$pet->id}/medical-records", [
            'record_type' => 'Vet visit', 'description' => 'Checkup', 'record_date' => now()->subDay()->toDateString(),
            'finance_expense' => ['ledger_id' => $ledger['id'], 'account_id' => $account['id'], 'category_id' => $category['id'], 'amount' => '250000'],
        ])->assertCreated();
        $this->assertDatabaseHas('ledger_transactions', ['ledger_id' => $ledger['id'], 'amount_minor' => 250000, 'type' => 'expense']);
        $this->deleteJson("/api/pets/{$pet->id}/medical-records/{$record->json('data.id')}")->assertUnprocessable();
        $this->deleteJson("/api/pets/{$pet->id}/medical-records/{$record->json('data.id')}?linked_transaction=keep")->assertOk();
        $this->assertDatabaseCount('ledger_transactions', 1);
        $this->assertDatabaseCount('ledger_transaction_health_links', 0);
    }

    public function test_pet_editor_cannot_delete_a_health_record_linked_to_another_users_ledger(): void
    {
        $pet = $this->createPetWithOwner($this->user, ['pet_type_id' => PetType::query()->where('slug', 'cat')->value('id')]);
        $ledger = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'Care', 'currency_code' => 'VND'])->json('data');
        $account = $this->getJson("/api/ledgers/{$ledger['id']}/accounts")->json('data.0');
        $record = $this->postJson("/api/pets/{$pet->id}/medical-records", [
            'record_type' => 'Vet visit',
            'record_date' => now()->subDay()->toDateString(),
            'finance_expense' => ['ledger_id' => $ledger['id'], 'account_id' => $account['id'], 'amount' => '250000'],
        ])->assertCreated();
        $editor = User::factory()->create();
        PetRelationship::factory()->editor()->active()->create([
            'user_id' => $editor->id,
            'pet_id' => $pet->id,
            'created_by' => $this->user->id,
        ]);

        $this->actingAs($editor)
            ->deleteJson("/api/pets/{$pet->id}/medical-records/{$record->json('data.id')}?linked_transaction=delete")
            ->assertForbidden();

        $this->assertDatabaseHas('medical_records', ['id' => $record->json('data.id')]);
        $this->assertDatabaseCount('ledger_transactions', 1);
        $this->assertDatabaseCount('ledger_transaction_health_links', 1);
    }

    public function test_transaction_filters_pet_snapshots_and_pet_finance_privacy(): void
    {
        $pet = $this->createPetWithOwner($this->user, ['name' => 'Miso', 'pet_type_id' => PetType::query()->where('slug', 'cat')->value('id')]);
        $ledger = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'Care', 'currency_code' => 'USD'])->json('data');
        $account = $this->getJson("/api/ledgers/{$ledger['id']}/accounts")->json('data.0');
        $this->postJson("/api/ledgers/{$ledger['id']}/pets/{$pet->id}")->assertCreated();
        $linked = $this->postJson("/api/ledgers/{$ledger['id']}/transactions", ['type' => 'expense', 'amount' => '9.50', 'occurred_on' => '2026-07-10', 'account_id' => $account['id'], 'description' => 'Food for Miso', 'pet_ids' => [$pet->id]])->assertCreated();
        $this->postJson("/api/ledgers/{$ledger['id']}/transactions", ['type' => 'income', 'amount' => '20', 'occurred_on' => '2026-07-11', 'account_id' => $account['id'], 'description' => 'Donation'])->assertCreated();

        $this->getJson("/api/ledgers/{$ledger['id']}/transactions?type=expense&pet_id={$pet->id}&search=Miso")
            ->assertOk()->assertJsonPath('data.total', 1)->assertJsonPath('data.items.0.id', $linked->json('data.id'));
        $this->assertDatabaseHas('ledger_transaction_pets', ['ledger_transaction_id' => $linked->json('data.id'), 'pet_name_snapshot' => 'Miso']);
        $this->getJson("/api/pets/{$pet->id}/finance-transactions")->assertOk()->assertJsonPath('data.total', 1);

        $outsider = User::factory()->create();
        $this->actingAs($outsider)->getJson("/api/pets/{$pet->id}/finance-transactions")->assertForbidden();
    }

    public function test_assigned_pet_without_transactions_has_zero_totals(): void
    {
        $pet = $this->createPetWithOwner($this->user, ['name' => 'Miso', 'pet_type_id' => PetType::query()->where('slug', 'cat')->value('id')]);
        $ledger = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'Care', 'currency_code' => 'VND'])->json('data');
        $this->postJson("/api/ledgers/{$ledger['id']}/pets/{$pet->id}")->assertCreated();

        $this->getJson("/api/ledgers/{$ledger['id']}/pets")
            ->assertOk()
            ->assertJsonPath('data.0.id', $pet->id)
            ->assertJsonPath('data.0.income_minor', 0)
            ->assertJsonPath('data.0.expense_minor', 0)
            ->assertJsonPath('data.0.net_activity_minor', 0);
    }

    public function test_multi_pet_transaction_totals_are_allocated_once_in_minor_units(): void
    {
        $catTypeId = PetType::query()->where('slug', 'cat')->value('id');
        $firstPet = $this->createPetWithOwner($this->user, ['name' => 'Miso', 'pet_type_id' => $catTypeId]);
        $secondPet = $this->createPetWithOwner($this->user, ['name' => 'Nori', 'pet_type_id' => $catTypeId]);
        $ledger = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'Shared care', 'currency_code' => 'USD'])->json('data');
        $accountId = $this->getJson("/api/ledgers/{$ledger['id']}/accounts")->json('data.0.id');
        $this->postJson("/api/ledgers/{$ledger['id']}/pets/{$firstPet->id}")->assertCreated();
        $this->postJson("/api/ledgers/{$ledger['id']}/pets/{$secondPet->id}")->assertCreated();
        $this->postJson("/api/ledgers/{$ledger['id']}/transactions", [
            'type' => 'expense', 'amount' => '5.01', 'occurred_on' => '2026-07-15',
            'account_id' => $accountId, 'pet_ids' => [$firstPet->id, $secondPet->id],
        ])->assertCreated();

        $pets = collect($this->getJson("/api/ledgers/{$ledger['id']}/pets")->assertOk()->json('data'))->keyBy('id');

        $this->assertSame(251, $pets->get($firstPet->id)['expense_minor']);
        $this->assertSame(250, $pets->get($secondPet->id)['expense_minor']);
        $this->assertSame(501, $pets->sum('expense_minor'));
    }

    public function test_receipts_are_single_file_private_and_uploader_attributed(): void
    {
        Storage::fake('private');
        $ledger = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'Receipts', 'currency_code' => 'USD'])->json('data');
        $account = $this->getJson("/api/ledgers/{$ledger['id']}/accounts")->json('data.0');
        $transaction = $this->postJson("/api/ledgers/{$ledger['id']}/transactions", ['type' => 'expense', 'amount' => '4.25', 'occurred_on' => '2026-07-15', 'account_id' => $account['id']])->json('data');

        $this->post("/api/ledgers/{$ledger['id']}/transactions/{$transaction['id']}/receipt", ['receipt' => UploadedFile::fake()->image('first.jpg')], ['Accept' => 'application/json'])->assertCreated();
        $this->post("/api/ledgers/{$ledger['id']}/transactions/{$transaction['id']}/receipt", ['receipt' => UploadedFile::fake()->image('replacement.jpg')], ['Accept' => 'application/json'])->assertCreated();
        $this->assertDatabaseCount('media', 1);
        $this->assertDatabaseHas('media', ['model_id' => $transaction['id'], 'collection_name' => 'receipt']);
        $this->assertSame($this->user->id, (int) Media::query()->firstOrFail()->getCustomProperty('uploaded_by_user_id'));

        $this->actingAs(User::factory()->create())->get("/api/ledgers/{$ledger['id']}/transactions/{$transaction['id']}/receipt")->assertForbidden();
        $this->actingAs($this->user)->get("/api/ledgers/{$ledger['id']}/transactions/{$transaction['id']}/receipt")->assertOk();
    }

    public function test_account_category_and_transaction_references_cannot_cross_ledgers(): void
    {
        $first = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'First', 'currency_code' => 'USD'])->json('data');
        $second = $this->postJson('/api/ledgers', ['title' => 'Second', 'currency_code' => 'USD'])->json('data');
        $otherAccount = $this->getJson("/api/ledgers/{$second['id']}/accounts")->json('data.0.id');
        $otherTransaction = $this->postJson("/api/ledgers/{$second['id']}/transactions", [
            'type' => 'expense', 'amount' => '2', 'occurred_on' => '2026-07-15', 'account_id' => $otherAccount,
        ])->assertCreated()->json('data');

        $this->postJson("/api/ledgers/{$first['id']}/transactions", ['type' => 'expense', 'amount' => '1', 'occurred_on' => '2026-07-15', 'account_id' => $otherAccount])->assertUnprocessable();
        $this->putJson("/api/ledgers/{$first['id']}/accounts/{$otherAccount}", ['name' => 'Intrusion'])->assertForbidden();
        $this->putJson("/api/ledgers/{$first['id']}/transactions/{$otherTransaction['id']}", ['amount' => '3'])->assertForbidden();
        $this->assertDatabaseHas('ledger_transactions', ['id' => $otherTransaction['id'], 'ledger_id' => $second['id'], 'amount_minor' => 200]);
    }

    public function test_group_sync_preserves_overlapping_manual_pet_availability(): void
    {
        $pet = $this->createPetWithOwner($this->user, ['pet_type_id' => PetType::query()->where('slug', 'cat')->value('id')]);
        $group = $this->actingAs($this->user)->postJson('/api/groups', ['name' => 'Rescue team', 'pet_ids' => [$pet->id]])->assertCreated()->json('data');
        $ledger = $this->postJson('/api/ledgers', ['title' => 'Rescue', 'currency_code' => 'VND'])->json('data');
        $this->postJson("/api/ledgers/{$ledger['id']}/pets/{$pet->id}")->assertCreated();
        $this->postJson("/api/ledgers/{$ledger['id']}/group-link", ['group_id' => $group['id'], 'sync_group_pets' => true])->assertOk();

        $this->getJson("/api/ledgers/{$ledger['id']}/pets")->assertOk()->assertJsonPath('data.0.sources.0', 'manual')->assertJsonCount(2, 'data.0.sources');
        $this->getJson('/api/ledgers')->assertOk()->assertJsonPath('data.0.pet_count', 1);
        $this->deleteJson("/api/groups/{$group['id']}/pets/{$pet->id}")->assertNoContent();
        $this->getJson("/api/ledgers/{$ledger['id']}/pets")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.sources.0', 'manual');
    }

    public function test_group_synced_pet_cannot_be_removed_as_a_manual_assignment(): void
    {
        $pet = $this->createPetWithOwner($this->user, ['pet_type_id' => PetType::query()->where('slug', 'cat')->value('id')]);
        $group = $this->actingAs($this->user)->postJson('/api/groups', ['name' => 'Rescue team', 'pet_ids' => [$pet->id]])->assertCreated()->json('data');
        $ledger = $this->postJson('/api/ledgers', ['title' => 'Rescue', 'currency_code' => 'VND'])->json('data');
        $this->postJson("/api/ledgers/{$ledger['id']}/group-link", ['group_id' => $group['id'], 'sync_group_pets' => true])->assertOk();

        $this->deleteJson("/api/ledgers/{$ledger['id']}/pets/{$pet->id}")
            ->assertNotFound()
            ->assertJsonPath('success', false);
        $this->getJson("/api/ledgers/{$ledger['id']}/pets")
            ->assertOk()
            ->assertJsonPath('data.0.id', $pet->id)
            ->assertJsonPath('data.0.sources.0', 'group_sync');
    }

    public function test_deleting_a_transaction_unlinks_but_preserves_its_health_record(): void
    {
        $pet = $this->createPetWithOwner($this->user, ['pet_type_id' => PetType::query()->where('slug', 'cat')->value('id')]);
        $ledger = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'Health', 'currency_code' => 'VND'])->json('data');
        $account = $this->getJson("/api/ledgers/{$ledger['id']}/accounts")->json('data.0.id');
        $record = $this->postJson("/api/pets/{$pet->id}/medical-records", ['record_type' => 'Checkup', 'description' => 'Healthy', 'record_date' => now()->subDay()->toDateString(), 'finance_expense' => ['ledger_id' => $ledger['id'], 'account_id' => $account, 'amount' => '100000']])->assertCreated();
        $transactionId = (int) LedgerTransactionHealthLink::query()->value('ledger_transaction_id');

        $this->deleteJson("/api/ledgers/{$ledger['id']}/transactions/{$transactionId}")->assertNoContent();
        $this->assertDatabaseHas('medical_records', ['id' => $record->json('data.id')]);
        $this->assertDatabaseMissing('ledger_transaction_health_links', ['ledger_transaction_id' => $transactionId]);
        $this->assertSoftDeleted('ledger_transactions', ['id' => $transactionId]);
    }

    public function test_one_time_group_import_does_not_enable_continuous_sync(): void
    {
        $pet = $this->createPetWithOwner($this->user, ['pet_type_id' => PetType::query()->where('slug', 'cat')->value('id')]);
        $group = $this->actingAs($this->user)->postJson('/api/groups', ['name' => 'One-time import', 'pet_ids' => [$pet->id]])->assertCreated()->json('data');
        $ledger = $this->postJson('/api/ledgers', ['title' => 'Imported', 'currency_code' => 'VND'])->json('data');
        $this->postJson("/api/ledgers/{$ledger['id']}/group-link", ['group_id' => $group['id'], 'import_pets' => true, 'sync_group_pets' => false])->assertOk();

        $this->deleteJson("/api/groups/{$group['id']}/pets/{$pet->id}")->assertNoContent();
        $this->getJson("/api/ledgers/{$ledger['id']}/pets")->assertOk()->assertJsonCount(1, 'data');
        $this->deleteJson("/api/ledgers/{$ledger['id']}/group-link")->assertNoContent();
        $this->getJson("/api/ledgers/{$ledger['id']}/pets")->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_disabling_sync_for_the_same_group_retires_group_pet_assignments(): void
    {
        $pet = $this->createPetWithOwner($this->user, ['pet_type_id' => PetType::query()->where('slug', 'cat')->value('id')]);
        $group = $this->actingAs($this->user)->postJson('/api/groups', ['name' => 'Rescue team', 'pet_ids' => [$pet->id]])->assertCreated()->json('data');
        $ledger = $this->postJson('/api/ledgers', ['title' => 'Rescue', 'currency_code' => 'VND'])->json('data');
        $this->postJson("/api/ledgers/{$ledger['id']}/group-link", ['group_id' => $group['id'], 'sync_group_pets' => true])->assertOk();

        $this->postJson("/api/ledgers/{$ledger['id']}/group-link", ['group_id' => $group['id'], 'sync_group_pets' => false])
            ->assertOk()
            ->assertJsonPath('data.sync_group_pets', false);

        $this->getJson("/api/ledgers/{$ledger['id']}/pets")->assertOk()->assertJsonCount(0, 'data');
        $this->assertDatabaseMissing('ledger_pet_assignments', [
            'ledger_id' => $ledger['id'], 'pet_id' => $pet->id, 'source_group_id' => $group['id'], 'end_at' => null,
        ]);
    }

    public function test_vaccination_renewal_and_microchip_can_each_create_explicit_expenses(): void
    {
        $pet = $this->createPetWithOwner($this->user, ['pet_type_id' => PetType::query()->where('slug', 'cat')->value('id')]);
        $ledger = $this->actingAs($this->user)->postJson('/api/ledgers', ['title' => 'Health expenses', 'currency_code' => 'VND'])->json('data');
        $account = $this->getJson("/api/ledgers/{$ledger['id']}/accounts")->json('data.0.id');
        $expense = ['ledger_id' => $ledger['id'], 'account_id' => $account, 'amount' => '150000'];

        $vaccination = $this->postJson("/api/pets/{$pet->id}/vaccinations", ['vaccine_name' => 'Rabies', 'administered_at' => now()->subDays(2)->toDateString(), 'finance_expense' => $expense])->assertCreated();
        $this->postJson("/api/pets/{$pet->id}/vaccinations/{$vaccination->json('data.id')}/renew", ['vaccine_name' => 'Rabies', 'administered_at' => now()->subDay()->toDateString(), 'finance_expense' => $expense])->assertCreated();
        $this->postJson("/api/pets/{$pet->id}/microchips", ['chip_number' => '123456789012345', 'implanted_at' => now()->subDay()->toDateString(), 'finance_expense' => $expense])->assertCreated();

        $this->assertDatabaseCount('ledger_transactions', 3);
        $this->assertDatabaseCount('ledger_transaction_health_links', 3);
        $this->assertDatabaseCount('ledger_transaction_pets', 3);
    }
}
