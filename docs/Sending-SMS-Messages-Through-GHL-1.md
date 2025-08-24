## Sending SMS Messages Through GHL: A Developer's Guide to the API Endpoint

To integrate SMS messaging into your platform using GoHighLevel (GHL), you will need to utilize their v2 API. This process involves two main steps: first, creating a contact record for the user with their mobile number, and second, using the contact's unique ID to send the SMS message. There is no direct API endpoint to send an SMS to a raw phone number without an associated contact.

### The Two-Step Process for Sending an SMS:

**Step 1: Create a Contact**

Before you can send an SMS to a user, they must exist as a contact within your GHL location. You can achieve this by making a `POST` request to the `/contacts/` endpoint.

**API Endpoint:**
```
POST https://services.leadconnectorhq.com/contacts/
```

**Key Parameters:**

Your request body should be a JSON object containing the contact's information. The essential field for sending an SMS is `phone`.

**Example Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "locationId": "YOUR_LOCATION_ID"
}```

Upon a successful request, the API will return a JSON object for the newly created contact, which will include the crucial `id` (the `contactId`).

**Step 2: Send the SMS Message**

Once you have the `contactId`, you can send an SMS message by making a `POST` request to the `/conversations/messages` endpoint.

**API Endpoint:**
```
POST https://services.leadconnectorhq.com/conversations/messages
```

**Key Parameters:**

The request body must be a JSON object that includes the `contactId` and the `message` you wish to send. The `type` must be set to "SMS".

**Example Request:**
```json
{
  "type": "SMS",
  "contactId": "THE_CONTACT_ID_FROM_STEP_1",
  "message": "Your verification code is 12345."
}```

A successful request will send the SMS to the phone number associated with the specified contact.

### Authentication:

GHL's v2 API uses OAuth 2.0 for authentication. To make authorized API requests, you will need to include an `Authorization` header with a Bearer Token.

**Header Format:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

To obtain an `Access Token`, you'll first need to create an app in the GHL Marketplace to get a `Client ID` and `Client Secret`. With these credentials, you can then follow the OAuth 2.0 authorization flow to generate an access token for your application.

### Important Considerations:

*   **API Versioning:** GoHighLevel is transitioning from its v1 API to a more robust v2 API. It is highly recommended to build new integrations using the v2 API endpoints as v1 may be deprecated in the future.
*   **Third-Party Integrations:** While the native GHL API provides the necessary functionality, several third-party services offer integrations that may simplify the process of sending SMS messages through GHL. These services often provide their own APIs and may handle contact creation and other GHL interactions in the background.