---
inclusion: always
---

# Coding Standards & Best Practices

## PHP/Laravel Standards

### Code Style
- **Laravel Pint** enforces PSR-12 with Laravel conventions
- Run before commit: `./vendor/bin/pint`
- No manual formatting needed - Pint handles it

### Naming Conventions
- **Models**: Singular PascalCase (`Pet`, `User`, `PlacementRequest`)
- **Controllers**: PascalCase + Controller suffix (`PetController`)
- **Services**: PascalCase + Service suffix (`PetManagementService`)
- **Methods**: camelCase (`createPet`, `updateStatus`)
- **Variables**: camelCase (`$petData`, `$userId`)

### Laravel Patterns
```php
// Controllers - thin, delegate to services
class PetController extends Controller
{
    public function store(StorePetRequest $request, PetService $petService)
    {
        $pet = $petService->createPet($request->validated());
        return response()->json(['data' => $pet], 201);
    }
}

// Services - business logic
class PetService
{
    public function createPet(array $data): Pet
    {
        // Business logic here
        return Pet::create($data);
    }
}

// Models - data and relationships
class Pet extends Model
{
    protected $fillable = ['name', 'type', 'status'];
    
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
```

### Authorization Patterns
```php
// Use policies with can() method
if ($user->can('update', $pet)) {
    // Allow action
}

// In controllers
$this->authorize('update', $pet);

// Avoid direct role checks - use permissions
// Good: $user->can('manage_pets')
// Bad: $user->hasRole('admin')
```

## TypeScript/React Standards

### Code Style
- **ESLint + Prettier** with strict TypeScript rules
- Run before commit: `npm run lint && npm run typecheck`

### Component Patterns
```typescript
// Functional components with TypeScript
interface PetCardProps {
  pet: Pet;
  onEdit?: (pet: Pet) => void;
}

export function PetCard({ pet, onEdit }: PetCardProps) {
  return (
    <div className="pet-card">
      <h3>{pet.name}</h3>
      {onEdit && (
        <Button onClick={() => onEdit(pet)}>
          Edit
        </Button>
      )}
    </div>
  );
}
```

### API Integration
```typescript
// Use React Query for server state
const { data: pets, isLoading } = useQuery({
  queryKey: ['pets'],
  queryFn: () => api.pets.list(),
});

// Form handling with react-hook-form + zod
const schema = z.object({
  name: z.string().min(1),
  type: z.enum(['cat', 'dog']),
});

const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
});
```

### File Organization
```
components/
├── ui/           # shadcn/ui components (don't modify)
├── forms/        # Form components
├── cards/        # Display components
└── layout/       # Layout components

pages/            # Route components only
hooks/            # Custom hooks
lib/              # Utilities
api/              # API client
```

## Testing Standards

### Backend Tests
```php
// Use descriptive test names
test('user can create pet with valid data')
{
    $user = User::factory()->create();
    $petData = Pet::factory()->make()->toArray();
    
    $response = $this->actingAs($user)
        ->postJson('/api/pets', $petData);
    
    $response->assertStatus(201)
        ->assertJsonStructure(['data' => ['id', 'name']]);
}
```

### Frontend Tests
```typescript
// Test user interactions, not implementation
test('submits pet form with valid data', async () => {
  const user = userEvent.setup();
  render(<PetForm onSubmit={mockSubmit} />);
  
  await user.type(screen.getByLabelText(/name/i), 'Fluffy');
  await user.click(screen.getByRole('button', { name: /save/i }));
  
  expect(mockSubmit).toHaveBeenCalledWith({
    name: 'Fluffy',
  });
});
```

## Documentation Standards

### Code Comments
- Explain **why**, not **what**
- Document complex business logic
- Use PHPDoc for public methods
- JSDoc for complex TypeScript functions

### API Documentation
- OpenAPI annotations on all endpoints
- Include request/response examples
- Document error responses
- Keep swagger docs up to date

## Security Standards

### Input Validation
- Always use Form Requests in Laravel
- Validate on both client and server
- Sanitize file uploads
- Use prepared statements (Eloquent handles this)

### Authentication & Authorization
- Session-based auth with CSRF protection
- Check permissions, not roles directly
- Validate ownership in policies
- Rate limit sensitive endpoints