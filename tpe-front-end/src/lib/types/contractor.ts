{
    "name": "Contractor",
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Contractor's full name"
      },
      "email": {
        "type": "string",
        "format": "email",
        "description": "Work email address"
      },
      "phone": {
        "type": "string",
        "description": "Cell phone number"
      },
      "company_name": {
        "type": "string",
        "description": "Name of the contracting company"
      },
      "company_website": {
        "type": "string",
        "description": "Company website URL"
      },
      "service_area": {
        "type": "string",
        "description": "Geographic area served"
      },
      "services_offered": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "List of services the company offers"
      },
      "verification_status": {
        "type": "string",
        "enum": [
          "pending",
          "verified",
          "failed"
        ],
        "default": "pending"
      },
      "verification_code": {
        "type": "string",
        "description": "SMS verification code"
      },
      "focus_areas": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": [
            "greenfield_growth",
            "controlling_lead_flow",
            "closing_higher_percentage",
            "installation_quality",
            "hiring_sales_leadership",
            "marketing_automation",
            "customer_retention",
            "operational_efficiency",
            "technology_integration",
            "financial_management"
          ]
        },
        "description": "Top 3 focus areas selected"
      },
      "primary_focus_area": {
        "type": "string",
        "description": "The identified primary focus area"
      },
      "annual_revenue": {
        "type": "string",
        "enum": [
          "under_500k",
          "500k_1m",
          "1m_5m",
          "5m_10m",
          "over_10m"
        ]
      },
      "team_size": {
        "type": "number",
        "description": "Total number of employees"
      },
      "readiness_indicators": {
        "type": "object",
        "properties": {
          "increased_tools": {
            "type": "boolean"
          },
          "increased_people": {
            "type": "boolean"
          },
          "increased_activity": {
            "type": "boolean"
          }
        }
      },
      "current_stage": {
        "type": "string",
        "enum": [
          "verification",
          "focus_selection",
          "profiling",
          "matching",
          "demo_booked",
          "completed"
        ],
        "default": "verification"
      },
      "assigned_partner_id": {
        "type": "string",
        "description": "ID of the matched strategic partner"
      },
      "demo_scheduled_date": {
        "type": "string",
        "format": "datetime"
      },
      "opted_in_coaching": {
        "type": "boolean",
        "default": false,
        "description": "Opted in for ongoing AI coaching"
      }
    },
    "required": [
      "name",
      "email",
      "phone",
      "company_name"
    ]
  }