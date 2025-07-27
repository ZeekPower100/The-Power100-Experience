{
    "name": "StrategicPartner",
    "type": "object",
    "properties": {
      "company_name": {
        "type": "string",
        "description": "Partner company name"
      },
      "description": {
        "type": "string",
        "description": "Company description and value proposition"
      },
      "logo_url": {
        "type": "string",
        "description": "Company logo image URL"
      },
      "website": {
        "type": "string",
        "description": "Company website"
      },
      "contact_email": {
        "type": "string",
        "format": "email"
      },
      "power100_subdomain": {
        "type": "string",
        "description": "Power100 subdomain for email routing"
      },
      "focus_areas_served": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Focus areas this partner can help with"
      },
      "target_revenue_range": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Revenue ranges they best serve"
      },
      "geographic_regions": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Geographic areas they serve"
      },
      "power_confidence_score": {
        "type": "number",
        "minimum": 0,
        "maximum": 100,
        "description": "AI-calculated confidence score"
      },
      "pricing_model": {
        "type": "string",
        "description": "Pricing structure description"
      },
      "onboarding_process": {
        "type": "string",
        "description": "Description of their onboarding process"
      },
      "key_differentiators": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "client_testimonials": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "client_name": {
              "type": "string"
            },
            "testimonial": {
              "type": "string"
            },
            "rating": {
              "type": "number"
            }
          }
        }
      },
      "is_active": {
        "type": "boolean",
        "default": true
      },
      "last_quarterly_report": {
        "type": "string",
        "format": "date"
      }
    },
    "required": [
      "company_name",
      "description",
      "contact_email",
      "focus_areas_served"
    ]
  }