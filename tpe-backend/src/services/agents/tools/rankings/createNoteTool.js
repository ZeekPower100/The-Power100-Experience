// DATABASE-CHECKED: account_notes verified 2026-03-15
// ================================================================
// Create Note Tool (LangGraph Rankings Rep Agent)
// ================================================================
// Purpose: Create account notes (manual or AI-generated)
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const rankingsDbService = require('../../../rankingsDbService');

const CreateNoteSchema = z.object({
  company_id: z.number().int().describe('The company ID'),
  user_id: z.number().int().optional().describe('The rep user ID'),
  note_type: z.enum(['manual', 'ai_generated', 'call_summary', 'meeting_notes', 'strategy']).default('ai_generated').describe('Type of note'),
  content: z.string().describe('The note content'),
  is_pinned: z.boolean().default(false).describe('Whether to pin this note to the top')
});

const createNoteFunction = async (params) => {
  console.log(`[Create Note] Creating ${params.note_type} note for company ${params.company_id}`);

  try {
    const result = await rankingsDbService.createAccountNote({
      company_id: params.company_id,
      user_id: params.user_id || null,
      note_type: params.note_type || 'ai_generated',
      content: params.content,
      is_pinned: params.is_pinned || false
    });

    return JSON.stringify({
      success: true,
      note_id: result.id,
      message: `Note created for company ${params.company_id} (${params.note_type})`
    });
  } catch (error) {
    console.error('[Create Note] Error:', error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

const createNoteTool = tool(
  createNoteFunction,
  {
    name: 'create_note',
    description: `Create an account note in the rankings database — manual notes, AI-generated insights, call summaries, or strategy notes.

Use this tool when:
- Capturing insights from a conversation
- Recording call summaries
- Documenting account strategy
- Saving AI-generated analysis

Returns: JSON with the created note ID.`,
    schema: CreateNoteSchema
  }
);

module.exports = createNoteTool;
