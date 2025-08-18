# Notification Preference API

This document describes the API endpoints for managing user notification preferences.

## Overview

The notification preference API allows users to control their notification settings for different types of notifications. Users can enable or disable both email and in-app notifications for each notification type.

## Endpoints

### GET /api/notification-preferences

Retrieves the current user's notification preferences for all notification types.

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "data": [
    {
      "type": "placement_request_response",
      "label": "Response to Placement Request",
      "group": "helper_profile",
      "email_enabled": true,
      "in_app_enabled": true
    },
    {
      "type": "placement_request_accepted",
      "label": "Placement Request Accepted",
      "group": "helper_profile",
      "email_enabled": false,
      "in_app_enabled": true
    }
  ]
}
```

**Response Fields:**
- `type`: The notification type identifier
- `label`: Human-readable label for the notification type
- `group`: The group this notification type belongs to
- `email_enabled`: Whether email notifications are enabled for this type
- `in_app_enabled`: Whether in-app notifications are enabled for this type

### PUT /api/notification-preferences

Updates the current user's notification preferences.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "preferences": [
    {
      "type": "placement_request_response",
      "email_enabled": false,
      "in_app_enabled": true
    },
    {
      "type": "helper_response_accepted",
      "email_enabled": true,
      "in_app_enabled": false
    }
  ]
}
```

**Request Fields:**
- `preferences`: Array of preference objects to update
- `preferences[].type`: The notification type to update (required)
- `preferences[].email_enabled`: Whether to enable email notifications (required, boolean)
- `preferences[].in_app_enabled`: Whether to enable in-app notifications (required, boolean)

**Response:**
```json
{
  "data": null,
  "message": "Notification preferences updated successfully"
}
```

**Validation Rules:**
- `preferences`: Must be present and an array (can be empty)
- `preferences.*.type`: Required, must be a valid notification type
- `preferences.*.email_enabled`: Required, must be boolean
- `preferences.*.in_app_enabled`: Required, must be boolean

**Valid Notification Types:**
- `placement_request_response`
- `placement_request_accepted`
- `helper_response_accepted`
- `helper_response_rejected`

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Unauthenticated."
}
```

### 422 Validation Error
```json
{
  "message": "The preferences.0.type field is required.",
  "errors": {
    "preferences.0.type": [
      "The preferences.0.type field is required."
    ]
  }
}
```

## Usage Examples

### Get Current Preferences
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json" \
  https://api.example.com/api/notification-preferences
```

### Update Preferences
```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "preferences": [
      {
        "type": "placement_request_response",
        "email_enabled": false,
        "in_app_enabled": true
      }
    ]
  }' \
  https://api.example.com/api/notification-preferences
```

### Disable All Email Notifications
```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "preferences": [
      {
        "type": "placement_request_response",
        "email_enabled": false,
        "in_app_enabled": true
      },
      {
        "type": "placement_request_accepted",
        "email_enabled": false,
        "in_app_enabled": true
      },
      {
        "type": "helper_response_accepted",
        "email_enabled": false,
        "in_app_enabled": true
      },
      {
        "type": "helper_response_rejected",
        "email_enabled": false,
        "in_app_enabled": true
      }
    ]
  }' \
  https://api.example.com/api/notification-preferences
```

## Notes

- If no preference exists for a notification type, the system defaults to both email and in-app notifications enabled
- Updating preferences will create new records if they don't exist, or update existing ones
- The `preferences` array can be empty to perform no updates
- Only the authenticated user can view and modify their own preferences
- All notification types are returned in the GET response, even if no explicit preference has been set