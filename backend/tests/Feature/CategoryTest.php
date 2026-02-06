<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategoryTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected PetType $catType;

    protected PetType $dogType;

    protected City $city;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->catType = PetType::create([
            'id' => 1,
            'name' => 'Cat',
            'slug' => 'cat',
            'is_system' => true,
            'display_order' => 1,
        ]);

        $this->dogType = PetType::create([
            'id' => 2,
            'name' => 'Dog',
            'slug' => 'dog',
            'is_system' => true,
            'display_order' => 2,
        ]);

        $this->city = City::factory()->create([
            'name' => 'Hanoi',
            'country' => 'VN',
        ]);
    }

    public function test_can_list_categories_for_pet_type(): void
    {
        Sanctum::actingAs($this->user);

        // Create some approved categories
        Category::factory()->forPetType($this->catType)->create(['name' => 'Siamese', 'approved_at' => now()]);
        Category::factory()->forPetType($this->catType)->create(['name' => 'Persian', 'approved_at' => now()]);
        Category::factory()->forPetType($this->dogType)->create(['name' => 'Labrador', 'approved_at' => now()]);

        $response = $this->getJson('/api/categories?pet_type_id='.$this->catType->id);

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['name' => 'Siamese'])
            ->assertJsonFragment(['name' => 'Persian'])
            ->assertJsonMissing(['name' => 'Labrador']);
    }

    public function test_list_categories_requires_pet_type_id(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/categories');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['pet_type_id']);
    }

    public function test_can_search_categories(): void
    {
        Sanctum::actingAs($this->user);

        Category::factory()->forPetType($this->catType)->create(['name' => 'Siamese', 'approved_at' => now()]);
        Category::factory()->forPetType($this->catType)->create(['name' => 'Bengal', 'approved_at' => now()]);

        $response = $this->getJson('/api/categories?pet_type_id='.$this->catType->id.'&search=sia');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['name' => 'Siamese']);
    }

    public function test_user_can_see_own_unapproved_categories(): void
    {
        Sanctum::actingAs($this->user);

        // Create unapproved category by the user
        Category::factory()->forPetType($this->catType)->create([
            'name' => 'My Custom Category',
            'created_by' => $this->user->id,
            'approved_at' => null,
        ]);

        // Create unapproved category by another user
        $otherUser = User::factory()->create();
        Category::factory()->forPetType($this->catType)->create([
            'name' => 'Other User Category',
            'created_by' => $otherUser->id,
            'approved_at' => null,
        ]);

        $response = $this->getJson('/api/categories?pet_type_id='.$this->catType->id);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'My Custom Category'])
            ->assertJsonMissing(['name' => 'Other User Category']);
    }

    public function test_can_create_category(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/categories', [
            'name' => 'Maine Coon',
            'pet_type_id' => $this->catType->id,
            'description' => 'Large fluffy cats',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'name' => 'Maine Coon',
                'slug' => 'maine-coon',
                'pet_type_id' => $this->catType->id,
            ]);

        $this->assertDatabaseHas('categories', [
            'name->en' => 'Maine Coon',
            'slug' => 'maine-coon',
            'pet_type_id' => $this->catType->id,
            'created_by' => $this->user->id,
            'approved_at' => null, // User-created categories are not approved by default
        ]);
    }

    public function test_cannot_create_duplicate_category_name_for_same_pet_type(): void
    {
        Sanctum::actingAs($this->user);

        Category::factory()->forPetType($this->catType)->create(['name' => 'Siamese']);

        $response = $this->postJson('/api/categories', [
            'name' => 'Siamese',
            'pet_type_id' => $this->catType->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_can_create_same_name_category_for_different_pet_type(): void
    {
        Sanctum::actingAs($this->user);

        Category::factory()->forPetType($this->catType)->create(['name' => 'Mixed Breed']);

        $response = $this->postJson('/api/categories', [
            'name' => 'Mixed Breed',
            'pet_type_id' => $this->dogType->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'name' => 'Mixed Breed',
                'pet_type_id' => $this->dogType->id,
            ]);
    }

    public function test_category_name_max_length(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/categories', [
            'name' => str_repeat('a', 51),
            'pet_type_id' => $this->catType->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_unauthenticated_cannot_create_category(): void
    {
        $response = $this->postJson('/api/categories', [
            'name' => 'Test Category',
            'pet_type_id' => $this->catType->id,
        ]);

        $response->assertStatus(401);
    }

    public function test_pet_can_have_categories(): void
    {
        Sanctum::actingAs($this->user);

        $category1 = Category::factory()->forPetType($this->catType)->create(['name' => 'Siamese', 'approved_at' => now()]);
        $category2 = Category::factory()->forPetType($this->catType)->create(['name' => 'Indoor', 'approved_at' => now()]);

        $response = $this->postJson('/api/pets', [
            'name' => 'Fluffy',
            'country' => 'VN',
            'city_id' => $this->city->id,
            'pet_type_id' => $this->catType->id,
            'category_ids' => [$category1->id, $category2->id],
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Fluffy'])
            ->assertJsonCount(2, 'data.categories');

        $pet = Pet::first();
        $this->assertCount(2, $pet->categories);
    }

    public function test_pet_categories_limited_to_10(): void
    {
        Sanctum::actingAs($this->user);

        $categories = Category::factory()
            ->count(11)
            ->forPetType($this->catType)
            ->create(['approved_at' => now()]);

        $response = $this->postJson('/api/pets', [
            'name' => 'Fluffy',
            'country' => 'VN',
            'city_id' => $this->city->id,
            'pet_type_id' => $this->catType->id,
            'category_ids' => $categories->pluck('id')->toArray(),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category_ids']);
    }

    public function test_can_update_pet_categories(): void
    {
        Sanctum::actingAs($this->user);

        $pet = Pet::factory()->create([
            'created_by' => $this->user->id,
            'pet_type_id' => $this->catType->id,
        ]);

        $category1 = Category::factory()->forPetType($this->catType)->create(['name' => 'Siamese', 'approved_at' => now()]);
        $category2 = Category::factory()->forPetType($this->catType)->create(['name' => 'Indoor', 'approved_at' => now()]);

        // Initially add one category
        $pet->categories()->attach($category1);

        // Update to different categories
        $response = $this->putJson('/api/pets/'.$pet->id, [
            'category_ids' => [$category2->id],
        ]);

        $response->assertStatus(200);

        $pet->refresh();
        $this->assertCount(1, $pet->categories);
        $this->assertEquals($category2->id, $pet->categories->first()->id);
    }

    public function test_category_model_relationships(): void
    {
        $category = Category::factory()->forPetType($this->catType)->create([
            'name' => 'Test Category',
            'created_by' => $this->user->id,
        ]);

        $this->assertInstanceOf(PetType::class, $category->petType);
        $this->assertEquals($this->catType->id, $category->petType->id);

        $this->assertInstanceOf(User::class, $category->creator);
        $this->assertEquals($this->user->id, $category->creator->id);
    }

    public function test_category_usage_count(): void
    {
        $category = Category::factory()->forPetType($this->catType)->create([
            'name' => 'Popular Category',
            'approved_at' => now(),
        ]);

        // Create pets with this category
        $pets = Pet::factory()->count(3)->create([
            'created_by' => $this->user->id,
            'pet_type_id' => $this->catType->id,
        ]);

        foreach ($pets as $pet) {
            $pet->categories()->attach($category);
        }

        $category->refresh();
        $this->assertEquals(3, $category->usage_count);
    }

    public function test_category_approval_methods(): void
    {
        $category = Category::factory()->forPetType($this->catType)->create([
            'approved_at' => null,
        ]);

        $this->assertFalse($category->isApproved());

        $category->approve();

        $this->assertTrue($category->isApproved());
        $this->assertNotNull($category->approved_at);
    }

    public function test_pet_type_has_categories_relationship(): void
    {
        $categories = Category::factory()
            ->count(3)
            ->forPetType($this->catType)
            ->create();

        $this->assertCount(3, $this->catType->categories);
    }

    public function test_category_slug_auto_generated(): void
    {
        $category = Category::create([
            'name' => 'Long Haired Cat',
            'pet_type_id' => $this->catType->id,
        ]);

        $this->assertEquals('long-haired-cat', $category->slug);
    }

    public function test_show_pet_includes_categories(): void
    {
        Sanctum::actingAs($this->user);

        $pet = Pet::factory()->create([
            'created_by' => $this->user->id,
            'pet_type_id' => $this->catType->id,
        ]);

        $category = Category::factory()->forPetType($this->catType)->create([
            'name' => 'Siamese',
            'approved_at' => now(),
        ]);

        $pet->categories()->attach($category);

        $response = $this->getJson('/api/pets/'.$pet->id);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Siamese']);
    }
}
