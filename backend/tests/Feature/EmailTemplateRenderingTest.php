<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Mail\PlacementRequestResponseMail;
use App\Mail\PlacementRequestAcceptedMail;
use App\Mail\HelperResponseAcceptedMail;
use App\Mail\HelperResponseRejectedMail;
use App\Models\User;
use App\Models\Cat;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Enums\NotificationType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

class EmailTemplateRenderingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Cat $cat;
    protected HelperProfile $helperProfile;
    protected PlacementRequest $placementRequest;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->cat = Cat::factory()->create();
        $this->helperProfile = HelperProfile::factory()->create();
        $this->placementRequest = PlacementRequest::factory()->create([
            'cat_id' => $this->cat->id,
            'user_id' => $this->user->id,
        ]);
    }

    public function test_placement_request_response_template_renders_successfully()
    {
        $mail = new PlacementRequestResponseMail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE,
            [
                'cat_id' => $this->cat->id,
                'helper_profile_id' => $this->helperProfile->id,
            ]
        );

        // This will throw an exception if the template has syntax errors
        $rendered = $mail->render();
        
        $this->assertStringContainsString($this->user->name, $rendered);
        $this->assertStringContainsString($this->cat->name, $rendered);
        $this->assertStringContainsString('unsubscribe', $rendered);
        $this->assertStringContainsString('View Response', $rendered);
    }

    public function test_placement_request_accepted_template_renders_successfully()
    {
        $mail = new PlacementRequestAcceptedMail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_ACCEPTED,
            [
                'cat_id' => $this->cat->id,
                'helper_profile_id' => $this->helperProfile->id,
            ]
        );

        $rendered = $mail->render();
        
        $this->assertStringContainsString('Congratulations', $rendered);
        $this->assertStringContainsString($this->user->name, $rendered);
        $this->assertStringContainsString($this->cat->name, $rendered);
        $this->assertStringContainsString('accepted', $rendered);
    }

    public function test_helper_response_accepted_template_renders_successfully()
    {
        $mail = new HelperResponseAcceptedMail(
            $this->user,
            NotificationType::HELPER_RESPONSE_ACCEPTED,
            [
                'cat_id' => $this->cat->id,
                'placement_request_id' => $this->placementRequest->id,
            ]
        );

        $rendered = $mail->render();
        
        $this->assertStringContainsString('Wonderful news', $rendered);
        $this->assertStringContainsString($this->user->name, $rendered);
        $this->assertStringContainsString($this->cat->name, $rendered);
        $this->assertStringContainsString('accepted', $rendered);
    }

    public function test_helper_response_rejected_template_renders_successfully()
    {
        $mail = new HelperResponseRejectedMail(
            $this->user,
            NotificationType::HELPER_RESPONSE_REJECTED,
            [
                'cat_id' => $this->cat->id,
            ]
        );

        $rendered = $mail->render();
        
        $this->assertStringContainsString('Thank you for your interest', $rendered);
        $this->assertStringContainsString($this->user->name, $rendered);
        $this->assertStringContainsString($this->cat->name, $rendered);
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
        $this->assertStringContainsString('your cat', $rendered); // Fallback text
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
            $mail = new $mailClass($this->user, $notificationType, ['cat_id' => $this->cat->id]);
            $rendered = $mail->render();

            // Check for required elements in all templates
            $this->assertStringContainsString($this->user->name, $rendered, "User name '{$this->user->name}' missing in {$mailClass}");
            $this->assertStringContainsString('unsubscribe', $rendered, "Unsubscribe link missing in {$mailClass}");
            $this->assertStringContainsString(config('app.name', 'Meo Mai Moi'), $rendered, "App name missing in {$mailClass}");
            $this->assertStringContainsString('Cat Rehoming Platform', $rendered, "Platform description missing in {$mailClass}");
        }
    }
}