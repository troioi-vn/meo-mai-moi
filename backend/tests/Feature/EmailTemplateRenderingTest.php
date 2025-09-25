<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Mail\HelperResponseAcceptedMail;
use App\Mail\HelperResponseRejectedMail;
use App\Mail\PlacementRequestAcceptedMail;
use App\Mail\PlacementRequestResponseMail;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailTemplateRenderingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Pet $pet;

    protected HelperProfile $helperProfile;

    protected PlacementRequest $placementRequest;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->pet = Pet::factory()->create();
        $this->helperProfile = HelperProfile::factory()->create();
        $this->placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $this->pet->id,
            'user_id' => $this->user->id,
        ]);
    }

    public function test_placement_request_response_template_renders_successfully()
    {
        $mail = new PlacementRequestResponseMail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE,
            [
                'pet_id' => $this->pet->id,
                'helper_profile_id' => $this->helperProfile->id,
            ]
        );

        // This will throw an exception if the template has syntax errors
        $rendered = $mail->render();

        $this->assertStringContainsString($this->user->name, $rendered);
        $this->assertStringContainsString($this->pet->name, $rendered);
        $this->assertStringContainsString('unsubscribe', $rendered);
        $this->assertStringContainsString('View Response', $rendered);
    }

    public function test_placement_request_accepted_template_renders_successfully()
    {
        $mail = new PlacementRequestAcceptedMail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_ACCEPTED,
            [
                'pet_id' => $this->pet->id,
                'helper_profile_id' => $this->helperProfile->id,
            ]
        );

        $rendered = $mail->render();

        $this->assertStringContainsString('Congratulations', $rendered);
        $this->assertStringContainsString($this->user->name, $rendered);
        $this->assertStringContainsString($this->pet->name, $rendered);
        $this->assertStringContainsString('accepted', $rendered);
    }

    public function test_helper_response_accepted_template_renders_successfully()
    {
        $mail = new HelperResponseAcceptedMail(
            $this->user,
            NotificationType::HELPER_RESPONSE_ACCEPTED,
            [
                'pet_id' => $this->pet->id,
                'placement_request_id' => $this->placementRequest->id,
            ]
        );

        $rendered = $mail->render();

        $this->assertStringContainsString('Wonderful news', $rendered);
        $this->assertStringContainsString($this->user->name, $rendered);
        $this->assertStringContainsString($this->pet->name, $rendered);
        $this->assertStringContainsString('accepted', $rendered);
    }

    public function test_helper_response_rejected_template_renders_successfully()
    {
        $mail = new HelperResponseRejectedMail(
            $this->user,
            NotificationType::HELPER_RESPONSE_REJECTED,
            [
                'pet_id' => $this->pet->id,
            ]
        );

        $rendered = $mail->render();

        $this->assertStringContainsString('Thank you for your interest', $rendered);
        $this->assertStringContainsString($this->user->name, $rendered);
        $this->assertStringContainsString($this->pet->name, $rendered);
        $this->assertStringContainsString('Browse Other Requests', $rendered);
    }

    public function test_templates_render_with_minimal_data()
    {
        // Test that templates work even with minimal data
        $mail = new PlacementRequestResponseMail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE,
            [] // No additional data
        );

        $rendered = $mail->render();

        $this->assertStringContainsString($this->user->name, $rendered);
        $this->assertStringContainsString('your pet', $rendered); // Fallback text (updated)
        $this->assertStringContainsString('unsubscribe', $rendered);
    }

    public function test_all_templates_include_required_elements()
    {
        $mailClasses = [
            PlacementRequestResponseMail::class,
            PlacementRequestAcceptedMail::class,
            HelperResponseAcceptedMail::class,
            HelperResponseRejectedMail::class,
        ];

        $notificationTypes = [
            NotificationType::PLACEMENT_REQUEST_RESPONSE,
            NotificationType::PLACEMENT_REQUEST_ACCEPTED,
            NotificationType::HELPER_RESPONSE_ACCEPTED,
            NotificationType::HELPER_RESPONSE_REJECTED,
        ];

        foreach (array_combine($mailClasses, $notificationTypes) as $mailClass => $notificationType) {
            $mail = new $mailClass($this->user, $notificationType, ['pet_id' => $this->pet->id]);
            $rendered = $mail->render();

            // Check for required elements in all templates
            $this->assertStringContainsString($this->user->name, $rendered, "User name '{$this->user->name}' missing in {$mailClass}");
            $this->assertStringContainsString('unsubscribe', $rendered, "Unsubscribe link missing in {$mailClass}");
            $this->assertStringContainsString(config('app.name', 'Meo Mai Moi'), $rendered, "App name missing in {$mailClass}");
            $this->assertStringContainsString('Cat Rehoming Platform', $rendered, "Platform description missing in {$mailClass}");
        }
    }
}
