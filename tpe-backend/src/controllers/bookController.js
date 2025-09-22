const db = require('../config/database');
const axios = require('axios');

// Fields that should trigger AI processing when updated
const AI_TRIGGER_FIELDS = [
  'description',
  'key_takeaways',
  'table_of_contents',
  'chapter_summaries',
  'key_concepts',
  'topics',
  'focus_areas_covered',
  'implementation_guides',
  'intended_solutions',
  'book_goals',
  'actionable_ratio',
  'target_audience',
  'writing_influence',
  'testimonials'
];

// Helper function to trigger AI processing via n8n webhook
const triggerBookAIProcessing = async (bookId, action, updates = {}) => {
  try {
    // Check if this is a new book or if any AI trigger fields were updated
    const shouldTrigger = action === 'created' ||
                         Object.keys(updates).some(field => AI_TRIGGER_FIELDS.includes(field));

    if (!shouldTrigger) {
      console.log(`📚 Book ${bookId}: No AI-relevant fields updated, skipping AI processing`);
      return;
    }

    // Use -dev suffix for development, production will use without suffix
    // Determine webhook path based on environment
    const webhookPath = process.env.NODE_ENV === 'production'
      ? 'book-ai-processing'
      : 'book-ai-processing-dev';

    // Use production n8n URL in production, localhost in development
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://n8n.srv918843.hstgr.cloud'
      : 'http://localhost:5678';

    const webhookUrl = process.env.N8N_BOOK_WEBHOOK_URL || `${baseUrl}/webhook/${webhookPath}`;
    console.log(`🔔 Triggering book AI processing for book ${bookId} (${action})`);

    const response = await axios.post(webhookUrl, {
      book_id: bookId,
      action: action,
      updated_fields: Object.keys(updates)
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000 // 30 second timeout
    });

    console.log(`✅ Book AI processing triggered successfully for book ${bookId}`);
    return response.data;
  } catch (error) {
    console.error(`⚠️ Failed to trigger book AI processing for book ${bookId}:`, error.message);
    // Don't throw error to prevent blocking the main operation
    // AI processing can be retried later if needed
  }
};

// Get all books
exports.getAllBooks = async (req, res) => {
  try {
    const query = `
      SELECT * FROM books 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
};

// Get pending books
exports.getPendingBooks = async (req, res) => {
  try {
    const query = `
      SELECT * FROM books 
      WHERE status = 'pending_review'
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    res.json({ books: result.rows });
  } catch (error) {
    console.error('Error fetching pending books:', error);
    res.status(500).json({ error: 'Failed to fetch pending books' });
  }
};

// Approve book
exports.approveBook = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE books 
      SET status = 'approved'
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error approving book:', error);
    res.status(500).json({ error: 'Failed to approve book' });
  }
};

// Get single book
exports.getBook = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM books WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
};

// Create new book
exports.createBook = async (req, res) => {
  try {
    const {
      title,
      author,
      description,
      cover_image_url,
      amazon_url,
      publication_year,
      topics,
      focus_areas_covered,
      target_audience,
      key_takeaways,
      testimonials,
      reading_time,
      difficulty_level,
      
      // New fields from Greg's requirements
      author_email,
      author_phone,
      author_linkedin_url,
      author_website,
      has_executive_assistant,
      ea_name,
      ea_email,
      ea_phone,
      ea_scheduling_link,
      key_citations,
      writing_influence,
      intended_solutions,
      author_next_focus,
      book_goals,
      author_availability,
      
      // Submitter fields
      submitter_name,
      submitter_email,
      submitter_phone,
      submitter_company,
      is_author,
      
      // Book content fields
      sample_chapter_link,
      table_of_contents,
      target_revenue,
      
      barnes_noble_url,
      author_website_purchase_url,
      submission_type,
      status,
      
      is_active = true
    } = req.body;

    // First, check which columns exist in the database
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'books'
    `;
    const columnsResult = await db.query(checkColumnsQuery);
    const existingColumns = columnsResult.rows.map(row => row.column_name);

    // Build dynamic insert query based on existing columns
    const fields = [];
    const values = [];
    const placeholders = [];
    let placeholderIndex = 1;

    // Add fields that exist in the database
    const fieldsToInsert = {
      title,
      author,
      description,
      cover_image_url,
      amazon_url,
      publication_year,
      topics,
      focus_areas_covered,
      target_audience,
      key_takeaways,
      testimonials,
      reading_time,
      difficulty_level,
      is_active
    };

    // Add new fields if columns exist
    if (existingColumns.includes('author_email')) fieldsToInsert.author_email = author_email;
    if (existingColumns.includes('author_phone')) fieldsToInsert.author_phone = author_phone;
    if (existingColumns.includes('author_linkedin_url')) fieldsToInsert.author_linkedin_url = author_linkedin_url;
    if (existingColumns.includes('author_website')) fieldsToInsert.author_website = author_website;
    if (existingColumns.includes('has_executive_assistant')) fieldsToInsert.has_executive_assistant = has_executive_assistant;
    if (existingColumns.includes('ea_name')) fieldsToInsert.ea_name = ea_name;
    if (existingColumns.includes('ea_email')) fieldsToInsert.ea_email = ea_email;
    if (existingColumns.includes('ea_phone')) fieldsToInsert.ea_phone = ea_phone;
    if (existingColumns.includes('ea_scheduling_link')) fieldsToInsert.ea_scheduling_link = ea_scheduling_link;
    if (existingColumns.includes('key_citations')) fieldsToInsert.key_citations = key_citations;
    
    // Strategic fields (correct names)
    if (existingColumns.includes('writing_influence')) fieldsToInsert.writing_influence = writing_influence;
    if (existingColumns.includes('intended_solutions')) fieldsToInsert.intended_solutions = intended_solutions;
    if (existingColumns.includes('author_next_focus')) fieldsToInsert.author_next_focus = author_next_focus;
    if (existingColumns.includes('book_goals')) fieldsToInsert.book_goals = book_goals;
    if (existingColumns.includes('author_availability')) fieldsToInsert.author_availability = author_availability;
    
    // Submitter fields
    if (existingColumns.includes('submitter_name')) fieldsToInsert.submitter_name = submitter_name;
    if (existingColumns.includes('submitter_email')) fieldsToInsert.submitter_email = submitter_email;
    if (existingColumns.includes('submitter_phone')) fieldsToInsert.submitter_phone = submitter_phone;
    if (existingColumns.includes('submitter_company')) fieldsToInsert.submitter_company = submitter_company;
    if (existingColumns.includes('is_author')) fieldsToInsert.is_author = is_author;
    
    // Book content fields
    if (existingColumns.includes('sample_chapter_link')) fieldsToInsert.sample_chapter_link = sample_chapter_link;
    if (existingColumns.includes('table_of_contents')) fieldsToInsert.table_of_contents = table_of_contents;
    if (existingColumns.includes('target_revenue')) fieldsToInsert.target_revenue = target_revenue;
    
    if (existingColumns.includes('barnes_noble_url')) fieldsToInsert.barnes_noble_url = barnes_noble_url;
    if (existingColumns.includes('author_website_purchase_url')) fieldsToInsert.author_website_purchase_url = author_website_purchase_url;
    if (existingColumns.includes('submission_type')) fieldsToInsert.submission_type = submission_type;
    if (existingColumns.includes('status')) fieldsToInsert.status = status;

    // Build the query dynamically
    for (const [key, value] of Object.entries(fieldsToInsert)) {
      if (value !== undefined && value !== null && value !== '') {
        fields.push(key);
        values.push(value);
        placeholders.push(`$${placeholderIndex++}`);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to insert' });
    }

    const insertQuery = `
      INSERT INTO books (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await db.query(insertQuery, values);

    // Trigger AI processing for new book
    const newBook = result.rows[0];
    await triggerBookAIProcessing(newBook.id, 'created');

    res.status(201).json(newBook);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'Failed to create book', details: error.message });
  }
};

// Update book
exports.updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove id from updates if present
    delete updates.id;

    // Check which columns exist in the database
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'books'
    `;
    const columnsResult = await db.query(checkColumnsQuery);
    const existingColumns = columnsResult.rows.map(row => row.column_name);

    // Build dynamic update query
    const setClause = [];
    const values = [];
    let placeholderIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (existingColumns.includes(key)) {
        setClause.push(`${key} = $${placeholderIndex++}`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id); // Add id as the last parameter
    const updateQuery = `
      UPDATE books
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${placeholderIndex}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Trigger AI processing if content fields were updated
    const updatedBook = result.rows[0];
    await triggerBookAIProcessing(updatedBook.id, 'updated', updates);

    res.json(updatedBook);
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Failed to update book', details: error.message });
  }
};

// Delete book
exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM books WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json({ message: 'Book deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
};