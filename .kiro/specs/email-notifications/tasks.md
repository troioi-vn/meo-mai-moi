# Email Notifications System - Implementation Plan

- [x] 1. Set up database schema and models
  - Create migration for notification_preferences table with user_id, notification_type, email_enabled, in_app_enabled columns
  - Create migration for email_configurations table with provider, is_active, config JSON columns
  - Create NotificationPreference model with relationships and helper methods
  - Create EmailConfiguration model with configuration management methods
  - _Requirements: 3.2, 3.3, 3.4, 1.2_

- [x] 2. Create notification type enum and configuration
  - Create NotificationType enum with placement request and helper response types
  - Add getGroup() and getLabel() methods to enum for categorization
  - Create notification type seeder for default user preferences
  - _Requirements: 2.2, 3.2_

- [x] 3. Implement email configuration service
  - Create EmailConfigurationService class for managing email provider settings
  - Implement getActiveConfiguration() and setActiveConfiguration() methods
  - Add testConfiguration() method for validating email settings
  - Create updateMailConfig() method to dynamically update Laravel mail configuration
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 4. Create notification service for routing
  - Create NotificationService class to handle notification routing logic
  - Implement send() method that checks user preferences and routes to appropriate channels
  - Add sendEmail() and sendInApp() methods for channel-specific handling
  - Create getUserPreferences() method to retrieve user notification settings
  - _Requirements: 4.1, 4.2, 5.1, 5.5_

- [x] 5. Implement email templates and mail classes
  - Create base NotificationMail class with common email functionality
  - Create email templates for placement request response, acceptance, helper acceptance/rejection
  - Implement specific mail classes: PlacementRequestResponseMail, PlacementRequestAcceptedMail, HelperResponseAcceptedMail, HelperResponseRejectedMail
  - Add template data injection and subject line generation
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 6. Create email sending job and queue handling
  - Create SendNotificationEmail job class for asynchronous email processing
  - Implement job handle() method with email sending logic
  - Add failed() method for handling email delivery failures
  - Implement delivery status tracking in notification records
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 7. Build Filament admin resource for email configuration
  - Create EmailConfigurationResource for Filament admin panel
  - Implement dynamic form fields based on selected email provider (SMTP/Mailgun)
  - Add test connection functionality with real-time validation
  - Create activation/deactivation controls for email configurations
  - _Requirements: 1.1, 1.2, 1.3, 1.6_

- [x] 8. Create notification preferences API endpoints
  - Create API controller for managing user notification preferences
  - Implement GET endpoint to retrieve user's current notification preferences
  - Add PUT endpoint to update user notification preferences
  - Create validation rules for preference updates
  - _Requirements: 3.1, 3.3, 3.4, 3.5_

- [x] 9. Build frontend notification preferences component
  - Create NotificationPreferences React component with table layout
  - Implement toggle switches for email and in-app notification preferences
  - Add real-time preference updates with API integration
  - Create loading states and error handling for preference changes
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 10. Integrate notification preferences into account page
  - Add notifications section to existing account page structure
  - Create dedicated NotificationsPage component for account settings
  - Implement navigation and routing for notification preferences
  - Add breadcrumbs and page title for notifications section
  - _Requirements: 3.1_

- [x] 11. Implement unsubscribe functionality
  - Create unsubscribe token generation for email notifications
  - Add unsubscribe links to all email templates
  - Create unsubscribe landing page and API endpoint
  - Implement automatic email notification disabling on unsubscribe
  - _Requirements: 4.6, 4.7_

- [x] 12. Add admin monitoring and statistics
  - Create notification statistics widget for Filament admin dashboard
  - Implement email delivery rate tracking and failure monitoring
  - Add notification delivery status display in admin notification resource
  - Create admin alerts for email configuration and delivery issues
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 13. Integrate email notifications with existing notification events
  - Update existing notification creation points to use new NotificationService
  - Modify placement request response handling to trigger email notifications
  - Update helper profile approval/rejection to send email notifications
  - Ensure backward compatibility with existing in-app notification system
  - _Requirements: 4.1, 5.1, 5.2_

- [x] 14. Create comprehensive test suite
  - Write unit tests for NotificationService, EmailConfigurationService, and models
  - Create feature tests for email notification delivery and preference management
  - Add integration tests for Filament admin email configuration
  - Implement frontend tests for notification preferences component
  - _Requirements: All requirements - testing coverage_

- [x] 15. Add configuration validation and error handling
  - Implement email configuration validation with provider-specific rules
  - Add graceful error handling for email delivery failures
  - Create user-friendly error messages for configuration issues
  - Implement fallback to in-app notifications when email fails
  - _Requirements: 1.4, 1.5, 4.4_

- [x] 16. Create database seeders and default configurations
  - Create seeder for default notification preferences for existing users
  - Add seeder for sample email configuration (disabled by default)
  - Create factory classes for testing notification preferences and email configurations
  - Implement migration to set default preferences for existing users
  - _Requirements: 3.2, 3.3_