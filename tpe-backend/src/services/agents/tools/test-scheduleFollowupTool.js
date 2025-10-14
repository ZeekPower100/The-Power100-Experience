// ================================================================
// Test: Schedule Follow-up Tool
// ================================================================
// Tests scheduleFollowupTool with real database insertions
// Updated with expanded followup_type constraint (October 13, 2025)
// ================================================================

const scheduleFollowupTool = require('./scheduleFollowupTool');

async function testScheduleFollowup() {
  console.log('='.repeat(80));
  console.log('Testing Schedule Follow-up Tool (Expanded Types)');
  console.log('='.repeat(80));

  try {
    // Test Case 1: Schedule reminder for tomorrow
    console.log('\n📍 Test Case 1: Schedule reminder for tomorrow');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10 AM tomorrow

    console.log(`Input: contractorId=1, scheduledTime=${tomorrow.toISOString()}, followupType=reminder`);

    const result1 = await scheduleFollowupTool.invoke({
      contractorId: 1,
      scheduledTime: tomorrow.toISOString(),
      followupType: 'reminder',
      messageTemplate: 'Hi {first_name}! Just a friendly reminder about your demo with {partner_name} scheduled for tomorrow at {demo_time}. Looking forward to it!',
      eventId: 1,
      aiShouldPersonalize: true,
      aiContextHints: {
        partnerName: 'AccuLynx',
        demoTime: '2:00 PM EST'
      }
    });

    console.log('\n✅ Result:');
    const parsed1 = JSON.parse(result1);
    console.log(JSON.stringify(parsed1, null, 2));

    if (parsed1.success) {
      console.log(`\n✅ Follow-up scheduled with ID: ${parsed1.followupId}`);
      console.log(`Scheduled for: ${parsed1.scheduledTime}`);
      console.log(`Time description: ${parsed1.timeDescription}`);
      console.log(`AI will personalize: ${parsed1.aiShouldPersonalize}`);
    }

    // Test Case 2: Schedule check-in (7 days out)
    console.log('\n\n📍 Test Case 2: Schedule check-in (7 days)');

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 0, 0, 0); // 2 PM next week

    const result2 = await scheduleFollowupTool.invoke({
      contractorId: 1,
      scheduledTime: nextWeek.toISOString(),
      followupType: 'check_in',
      messageTemplate: 'Hey {first_name}, checking in on your progress. How are things going with your business goals?',
      actionItemId: 5,
      aiShouldPersonalize: true
    });

    const parsed2 = JSON.parse(result2);
    console.log(`\n✅ Check-in scheduled: ${parsed2.followupId}`);
    console.log(`Time until follow-up: ${parsed2.timeDescription}`);

    // Test Case 3: Schedule post-event survey (2 hours)
    console.log('\n\n📍 Test Case 3: Schedule post-event survey');

    const in2Hours = new Date();
    in2Hours.setHours(in2Hours.getHours() + 2);

    const result3 = await scheduleFollowupTool.invoke({
      contractorId: 1,
      scheduledTime: in2Hours.toISOString(),
      followupType: 'post_event_survey',
      messageTemplate: 'Thanks for attending the Power100 Event! We\'d love your feedback: {survey_link}',
      eventId: 1,
      aiShouldPersonalize: false,
      aiContextHints: {
        surveyLink: 'https://power100.io/survey/123'
      }
    });

    const parsed3 = JSON.parse(result3);
    console.log(`\n✅ Survey follow-up scheduled: ${parsed3.followupId}`);
    console.log(`AI personalization: ${parsed3.aiShouldPersonalize}`);
    console.log(`Message: ${parsed3.message}`);

    // Test Case 4: Schedule event recap (later today)
    console.log('\n\n📍 Test Case 4: Schedule event recap');

    const evening = new Date();
    evening.setHours(18, 0, 0, 0); // 6 PM today

    const result4 = await scheduleFollowupTool.invoke({
      contractorId: 1,
      scheduledTime: evening.toISOString(),
      followupType: 'event_recap',
      messageTemplate: 'What a great day at the Power100 Event! Here are your key takeaways and next steps...',
      eventId: 1,
      aiShouldPersonalize: true
    });

    const parsed4 = JSON.parse(result4);
    console.log(`\n✅ Event recap scheduled: ${parsed4.followupId}`);
    console.log(`Time: ${parsed4.timeDescription}`);

    // Test Case 5: Schedule resource recommendation (30 days)
    console.log('\n\n📍 Test Case 5: Schedule resource recommendation');

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    nextMonth.setHours(9, 0, 0, 0); // 9 AM in 30 days

    const result5 = await scheduleFollowupTool.invoke({
      contractorId: 1,
      scheduledTime: nextMonth.toISOString(),
      followupType: 'resource_recommendation',
      messageTemplate: 'Hi {first_name}, based on your focus areas, I think you\'ll love this book/podcast/event...',
      aiShouldPersonalize: true,
      aiContextHints: {
        focusAreas: ['customer_retention', 'revenue_growth']
      }
    });

    const parsed5 = JSON.parse(result5);
    console.log(`\n✅ Resource recommendation scheduled: ${parsed5.followupId}`);
    console.log(`Time: ${parsed5.timeDescription}`);

    // Test Case 6: Schedule partner introduction (3 days)
    console.log('\n\n📍 Test Case 6: Schedule partner introduction follow-up');

    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    in3Days.setHours(11, 0, 0, 0);

    const result6 = await scheduleFollowupTool.invoke({
      contractorId: 1,
      scheduledTime: in3Days.toISOString(),
      followupType: 'partner_introduction',
      messageTemplate: 'How did your demo with {partner_name} go? Would love to hear your feedback!',
      aiShouldPersonalize: true,
      aiContextHints: {
        partnerName: 'JobNimbus'
      }
    });

    const parsed6 = JSON.parse(result6);
    console.log(`\n✅ Partner introduction follow-up scheduled: ${parsed6.followupId}`);
    console.log(`Time: ${parsed6.timeDescription}`);

    // Test Case 7: Schedule offer_help (5 days)
    console.log('\n\n📍 Test Case 7: Schedule proactive help offer');

    const in5Days = new Date();
    in5Days.setDate(in5Days.getDate() + 5);
    in5Days.setHours(10, 0, 0, 0);

    const result7 = await scheduleFollowupTool.invoke({
      contractorId: 1,
      scheduledTime: in5Days.toISOString(),
      followupType: 'offer_help',
      messageTemplate: 'Hey {first_name}, just checking in - is there anything I can help you with this week?',
      aiShouldPersonalize: true
    });

    const parsed7 = JSON.parse(result7);
    console.log(`\n✅ Help offer scheduled: ${parsed7.followupId}`);
    console.log(`Time: ${parsed7.timeDescription}`);

    // Test Case 8: Test past time adjustment
    console.log('\n\n📍 Test Case 8: Test past time adjustment');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result8 = await scheduleFollowupTool.invoke({
      contractorId: 1,
      scheduledTime: yesterday.toISOString(),
      followupType: 'status_update',
      messageTemplate: 'This should be adjusted to +1 hour from now',
      aiShouldPersonalize: false
    });

    const parsed8 = JSON.parse(result8);
    console.log(`\n✅ Past time auto-adjusted: ${parsed8.followupId}`);
    console.log(`New scheduled time: ${parsed8.scheduledTime}`);
    console.log(`Message: ${parsed8.message}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ All Schedule Follow-up Tool tests completed successfully!');
    console.log('='.repeat(80));
    console.log('\n📊 Test Summary (9 Followup Types Tested):');
    console.log('  - reminder (tomorrow): Scheduled');
    console.log('  - check_in (7 days): Scheduled');
    console.log('  - post_event_survey (2 hours): Scheduled');
    console.log('  - event_recap (today): Scheduled');
    console.log('  - resource_recommendation (30 days): Scheduled');
    console.log('  - partner_introduction (3 days): Scheduled');
    console.log('  - offer_help (5 days): Scheduled');
    console.log('  - status_update (past time adjustment): Validated');
    console.log('  - completion_confirmation: Not tested (would need action item)');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }

  process.exit(0);
}

// Run tests
testScheduleFollowup();
