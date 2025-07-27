{
    "name": "DemoBooking",
    "type": "object",
    "properties": {
      "contractor_id": {
        "type": "string",
        "description": "Reference to contractor"
      },
      "partner_id": {
        "type": "string",
        "description": "Reference to strategic partner"
      },
      "scheduled_date": {
        "type": "string",
        "format": "datetime"
      },
      "focus_area": {
        "type": "string",
        "description": "Primary focus area for this demo"
      },
      "status": {
        "type": "string",
        "enum": [
          "scheduled",
          "completed",
          "cancelled",
          "no_show"
        ],
        "default": "scheduled"
      },
      "demo_type": {
        "type": "string",
        "enum": [
          "initial_demo",
          "follow_up",
          "refresher"
        ],
        "default": "initial_demo"
      },
      "meeting_notes": {
        "type": "string",
        "description": "Notes from the demo meeting"
      },
      "contractor_feedback": {
        "type": "object",
        "properties": {
          "rating": {
            "type": "number",
            "minimum": 1,
            "maximum": 5
          },
          "comments": {
            "type": "string"
          },
          "likelihood_to_proceed": {
            "type": "string",
            "enum": [
              "very_likely",
              "likely",
              "neutral",
              "unlikely",
              "very_unlikely"
            ]
          }
        }
      },
      "follow_up_needed": {
        "type": "boolean",
        "default": false
      },
      "next_steps": {
        "type": "string",
        "description": "Agreed next steps from the demo"
      }
    },
    "required": [
      "contractor_id",
      "partner_id",
      "focus_area"
    ]
  }