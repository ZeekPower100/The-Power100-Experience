#!/usr/bin/env node

/**
 * GoHighLevel MCP Server for The Power100 Experience
 * Provides direct GHL integration for Claude Code
 */

const { Server } = require('@anthropic-ai/mcp-server');
const axios = require('axios');

class GHLMCPServer {
  constructor() {
    this.server = new Server();
    this.token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
    this.locationId = process.env.GHL_LOCATION_ID;
    this.baseURL = 'https://services.leadconnectorhq.com';
    
    if (!this.token || !this.locationId) {
      throw new Error('GHL_PRIVATE_INTEGRATION_TOKEN and GHL_LOCATION_ID must be set');
    }
    
    this.setupHandlers();
  }

  setupHandlers() {
    // Contact Management Tools
    this.server.addTool({
      name: 'ghl_create_contact',
      description: 'Create a new contact in GoHighLevel',
      inputSchema: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          customFields: { type: 'object' }
        },
        required: ['firstName', 'email']
      }
    }, this.createContact.bind(this));

    this.server.addTool({
      name: 'ghl_send_sms',
      description: 'Send SMS message via GoHighLevel',
      inputSchema: {
        type: 'object',
        properties: {
          contactId: { type: 'string' },
          message: { type: 'string' },
          phone: { type: 'string' }
        },
        required: ['message']
      }
    }, this.sendSMS.bind(this));

    this.server.addTool({
      name: 'ghl_get_contact',
      description: 'Get contact information from GoHighLevel',
      inputSchema: {
        type: 'object',
        properties: {
          contactId: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' }
        }
      }
    }, this.getContact.bind(this));

    this.server.addTool({
      name: 'ghl_update_contact',
      description: 'Update existing contact in GoHighLevel',
      inputSchema: {
        type: 'object',
        properties: {
          contactId: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          customFields: { type: 'object' }
        },
        required: ['contactId']
      }
    }, this.updateContact.bind(this));
  }

  async createContact(args) {
    try {
      const response = await axios.post(
        `${this.baseURL}/contacts/`,
        {
          locationId: this.locationId,
          firstName: args.firstName,
          lastName: args.lastName,
          email: args.email,
          phone: args.phone,
          tags: args.tags || [],
          customFields: args.customFields || {}
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        content: [{
          type: 'text',
          text: `Contact created successfully: ${JSON.stringify(response.data, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error creating contact: ${error.response?.data?.message || error.message}`
        }],
        isError: true
      };
    }
  }

  async sendSMS(args) {
    try {
      const endpoint = args.contactId 
        ? `${this.baseURL}/conversations/messages`
        : `${this.baseURL}/conversations/messages`;

      const payload = {
        locationId: this.locationId,
        message: args.message,
        type: 'SMS'
      };

      if (args.contactId) {
        payload.contactId = args.contactId;
      } else if (args.phone) {
        payload.phone = args.phone;
      }

      const response = await axios.post(endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      });

      return {
        content: [{
          type: 'text',
          text: `SMS sent successfully: ${JSON.stringify(response.data, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error sending SMS: ${error.response?.data?.message || error.message}`
        }],
        isError: true
      };
    }
  }

  async getContact(args) {
    try {
      let url = `${this.baseURL}/contacts/`;
      
      if (args.contactId) {
        url += args.contactId;
      } else if (args.email) {
        url += `lookup?email=${args.email}&locationId=${this.locationId}`;
      } else if (args.phone) {
        url += `lookup?phone=${args.phone}&locationId=${this.locationId}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Version': '2021-07-28'
        }
      });

      return {
        content: [{
          type: 'text',
          text: `Contact found: ${JSON.stringify(response.data, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error getting contact: ${error.response?.data?.message || error.message}`
        }],
        isError: true
      };
    }
  }

  async updateContact(args) {
    try {
      const { contactId, ...updateData } = args;
      
      const response = await axios.put(
        `${this.baseURL}/contacts/${contactId}`,
        {
          locationId: this.locationId,
          ...updateData
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        content: [{
          type: 'text',
          text: `Contact updated successfully: ${JSON.stringify(response.data, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error updating contact: ${error.response?.data?.message || error.message}`
        }],
        isError: true
      };
    }
  }

  async start() {
    await this.server.connect();
    console.log('GHL MCP Server running...');
  }
}

// Start the server
if (require.main === module) {
  const server = new GHLMCPServer();
  server.start().catch(console.error);
}

module.exports = GHLMCPServer;