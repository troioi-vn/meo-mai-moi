<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Mail\PlacementRequestResponseMail;
use App\Mail\PlacementRequestAcceptedMail;
use App\Mail\HelperResponseAcceptedMail;
use App\Mail\HelperResponseRejectedMail;
use App\Models\User;
use App\Models\Cat;
use App\Models\HelperProfile;
use App\Enums\NotificationType;
use Illuminate\Foundation\Testing\RefreshDatabase;

class NotificationMailTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Cat $cat;
    protected HelperProfile $helperProfile;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->cat = Cat::factory()->create();
        $this->helperProfile = HelperProfile::factory()->create();
    }

    public function test_placement_request_response_mail_has_correct_subject_and_template()
    {
        $mail = new PlacementRequestResponseMail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE,
            ['cat_id' => $this->cat->id]
        );

        $this->assertStringContainsString('New response to your placement request', $mail->envelope()->subject);
        $this->assertStringContainsString($this->cat->name, $mail->envelope()->subject);
        $this->assertEquals('emails.notifications.placement-request-response', $mail->content()->view);
    }

    public function test_placement_request_accepted_mail_has_correct_subject_and_template()
    {
        $mail = new PlacementRequestAcceptedMail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_ACCEPTED,
            ['cat_id' => $this->cat->id]
        );

        $this->assertStringContainsString('accepted', $mail->envelope()->subject);
        $this->assertStringContainsString($this->cat->name, $mail->envelope()->subject);
        $this->assertEquals('emails.notifications.placement-request-accepted', $mail->content()->view);
    }

    public function test_helper_response_accepted_mail_has_correct_subject_and_template()
    {
        $mail = new HelperResponseAcceptedMail(
            $this->user,
            NotificationType::HELPER_RESPONSE_ACCEPTED,
            ['cat_id' => $this->cat->id]
        );

        $this->assertStringContainsString('accepted', $mail->envelope()->subject);
        $this->assertStringContainsString($this->cat->name, $mail->envelope()->subject);
        $this->assertEquals('emails.notifications.helper-response-accepted', $mail->content()->view);
    }

    public function test_helper_response_rejected_mail_has_correct_subject_and_template()
    {
        $mail = new HelperResponseRejectedMail(
            $this->user,
            NotificationType::HELPER_RESPONSE_REJECTED,
            ['cat_id' => $this->cat->id]
        );

        $this->assertStringContainsString('Update on your response', $mail->envelope()->subject);
        $this->assertStringContainsString($this->cat->name, $mail->envelope()->subject);
        $this->assertEquals('emails.notifications.helper-response-rejected', $mail->content()->view);
    }

    public function test_mail_template_data_includes_required_fields()
    {
        $mail = new PlacementRequestResponseMail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE,
            [
                'cat_id' => $this->cat->id,
                'helper_profile_id' => $this->helperProfile->id,
            ]
        );

        $templateData = $mail->content()->with;

        $this->assertArrayHasKey('user', $templateData);
        $this->assertArrayHasKey('cat', $templateData);
        $this->assertArrayHasKey('helperProfile', $templateData);
        $this->assertArrayHasKey('actionUrl', $templateData);
        $this->assertArrayHasKey('unsubscribeUrl', $templateData);
        $this->assertArrayHasKey('appName', $templateData);
        $this->assertArrayHasKey('appUrl', $templateData);

        $this->assertEquals($this->user->id, $templateData['user']->id);
        $this->assertEquals($this->cat->id, $templateData['cat']->id);
        $this->assertEquals($this->helperProfile->id, $templateData['helperProfile']->id);
    }

    public function test_mail_handles_missing_cat_gracefully()
    {
        $mail = new PlacementRequestResponseMail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE,
            ['cat_id' => 99999] // Non-existent cat ID
        );

        $subject = $mail->envelope()->subject;
        $this->assertStringContainsString('your cat', $subject);
    }

    public function test_unsubscribe_url_contains_required_parameters()
    {
        $mail = new PlacementRequestResponseMail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE
        );

        $templateData = $mail->content()->with;
        $unsubscribeUrl = $templateData['unsubscribeUrl'];

        $this->assertStringContainsString('unsubscribe', $unsubscribeUrl);
        $this->assertStringContainsString('user=' . $this->user->id, $unsubscribeUrl);
        $this->assertStringContainsString('type=' . NotificationType::PLACEMENT_REQUEST_RESPONSE->value, $unsubscribeUrl);
        $this->assertStringContainsString('token=', $unsubscribeUrl);
    }

    public function test_action_url_points_to_requests_page()
    {
        $mail = new PlacementRequestResponseMail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE
        );

        $templateData = $mail->content()->with;
        $actionUrl = $templateData['actionUrl'];

        $this->assertStringContainsString('/requests', $actionUrl);
    }
}