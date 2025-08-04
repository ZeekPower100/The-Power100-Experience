# Strategic Automation Development Workflow

Develop n8n workflows and strategic AI agents for The Power100 Experience automation.

## Process:
1. **Think hard** about the automation's role in the TPE ecosystem
2. Create automation branch: `claude/automation-$ARGUMENTS`
3. Analyze workflow requirements and trigger conditions
4. Design automation logic and integration points
5. Implement n8n workflows or AI agent logic
6. Create comprehensive automation tests
7. Integrate with existing TPE systems
8. Test automation within the full TPE workflow
9. Document automation capabilities and maintenance
10. Create PR with automation specifications

## Arguments:
- $ARGUMENTS: Automation scope (e.g., "email-sequence-partner-handoff" or "data-gathering-quarterly-calls")

## Available Automations:

### n8n Workflows
- **Email Sequences**: Automated contractor-partner introductions
- **Partner Handoffs**: Demo booking and cadence automation
- **Feedback Collection**: Quarterly customer outreach orchestration
- **Reporting**: PowerConfidence score generation and distribution

### Strategic AI Agents (2 Key Agents Only)
- **Data-Gathering Agent**: Quarterly feedback collection via calls/texts/emails
- **Concierge Agent**: Ongoing contractor support and coaching

## Development Checklist:
- [ ] **Clear Purpose**: Well-defined automation objective
- [ ] **Trigger Design**: Proper workflow triggers and conditions
- [ ] **Integration**: Seamless connection with TPE backend APIs
- [ ] **Error Handling**: Graceful failure and retry mechanisms
- [ ] **Testing**: Comprehensive workflow and edge case testing
- [ ] **Monitoring**: Logging and performance tracking
- [ ] **Documentation**: Workflow behavior and maintenance guides

## Examples:
- `/automation email-sequence-demo-booking`
- `/automation data-gathering-quarterly-voice-calls`
- `/automation concierge-weekly-contractor-checkin`
- `/automation partner-handoff-workflow`
- `/automation powerconfidence-report-generation`

## Integration Requirements:
- Must integrate with TPE backend APIs
- Must use standardized webhook and API protocols
- Must handle authentication and session management
- Must provide detailed logging and monitoring
- Must gracefully handle failures and escalations
- Should leverage existing Twilio and SendGrid integrations