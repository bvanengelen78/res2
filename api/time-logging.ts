import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CORS helper
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Auth helper
function verifyToken(req: VercelRequest): any | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.user;
  } catch (error) {
    return null;
  }
}

// Time entries handlers
async function handleGetTimeEntries(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: timeEntries, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        resource:resources(*),
        project:projects(*)
      `)
      .order('weekStartDate', { ascending: false });

    if (error) throw error;
    res.json(timeEntries);
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ message: 'Failed to fetch time entries' });
  }
}

async function handleCreateTimeEntry(req: VercelRequest, res: VercelResponse) {
  try {
    // Sanitize hour fields to prevent empty string database errors
    const sanitizedData = { ...req.body };
    const hourFields = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];

    hourFields.forEach(field => {
      if (sanitizedData[field] === '' || sanitizedData[field] === null || sanitizedData[field] === undefined) {
        sanitizedData[field] = "0.00";
      }
    });

    const { data: timeEntry, error } = await supabase
      .from('time_entries')
      .insert(sanitizedData)
      .select(`
        *,
        resource:resources(*),
        project:projects(*)
      `)
      .single();

    if (error) throw error;
    res.status(201).json(timeEntry);
  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({ message: 'Failed to create time entry' });
  }
}

async function handleUpdateTimeEntry(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    const timeEntryId = parseInt(id);
    if (isNaN(timeEntryId)) {
      return res.status(400).json({ message: 'Invalid time entry ID' });
    }

    // Sanitize hour fields
    const sanitizedData = { ...req.body };
    const hourFields = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];

    hourFields.forEach(field => {
      if (sanitizedData[field] === '' || sanitizedData[field] === null || sanitizedData[field] === undefined) {
        sanitizedData[field] = "0.00";
      }
    });

    const { data: timeEntry, error } = await supabase
      .from('time_entries')
      .update(sanitizedData)
      .eq('id', timeEntryId)
      .select(`
        *,
        resource:resources(*),
        project:projects(*)
      `)
      .single();

    if (error) throw error;
    res.json(timeEntry);
  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({ message: 'Failed to update time entry' });
  }
}

// Weekly submissions handlers
async function handleGetWeeklySubmissions(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: submissions, error } = await supabase
      .from('weekly_submissions')
      .select(`
        *,
        resource:resources(*)
      `)
      .order('weekStartDate', { ascending: false });

    if (error) throw error;
    res.json(submissions);
  } catch (error) {
    console.error('Get weekly submissions error:', error);
    res.status(500).json({ message: 'Failed to fetch weekly submissions' });
  }
}

async function handleGetPendingSubmissions(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: submissions, error } = await supabase
      .from('weekly_submissions')
      .select(`
        *,
        resource:resources(*)
      `)
      .eq('status', 'pending')
      .order('weekStartDate', { ascending: false });

    if (error) throw error;
    res.json(submissions);
  } catch (error) {
    console.error('Get pending submissions error:', error);
    res.status(500).json({ message: 'Failed to fetch pending submissions' });
  }
}

async function handleCreateWeeklySubmission(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: submission, error } = await supabase
      .from('weekly_submissions')
      .insert(req.body)
      .select(`
        *,
        resource:resources(*)
      `)
      .single();

    if (error) throw error;
    res.status(201).json(submission);
  } catch (error) {
    console.error('Create weekly submission error:', error);
    res.status(500).json({ message: 'Failed to create weekly submission' });
  }
}

async function handleSubmitTimesheet(req: VercelRequest, res: VercelResponse, resourceId: string, weekStartDate: string) {
  try {
    const id = parseInt(resourceId);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    // Create or update weekly submission
    const { data: submission, error } = await supabase
      .from('weekly_submissions')
      .upsert({
        resourceId: id,
        weekStartDate,
        status: 'submitted',
        submittedAt: new Date().toISOString()
      })
      .select(`
        *,
        resource:resources(*)
      `)
      .single();

    if (error) throw error;
    res.json(submission);
  } catch (error) {
    console.error('Submit timesheet error:', error);
    res.status(500).json({ message: 'Failed to submit timesheet' });
  }
}

async function handleGetSubmissionOverview(req: VercelRequest, res: VercelResponse) {
  try {
    const { week, department } = req.query;
    
    if (!week || typeof week !== 'string') {
      return res.status(400).json({ message: "Week parameter is required" });
    }

    // Get all resources and their submission status for the week
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('*')
      .eq('status', 'active');

    if (resourcesError) throw resourcesError;

    const { data: submissions, error: submissionsError } = await supabase
      .from('weekly_submissions')
      .select('*')
      .eq('weekStartDate', week);

    if (submissionsError) throw submissionsError;

    // Apply department filter if specified
    let filteredResources = resources || [];
    if (department && department !== 'all') {
      filteredResources = resources?.filter(r => {
        const resourceDepartment = r.department || r.role || 'General';
        return resourceDepartment === department;
      }) || [];
    }

    // Build overview
    const overview = filteredResources.map(resource => {
      const submission = submissions?.find(s => s.resourceId === resource.id);
      return {
        resource,
        submission,
        status: submission?.status || 'not_submitted'
      };
    });

    res.json(overview);
  } catch (error) {
    console.error('Get submission overview error:', error);
    res.status(500).json({ message: 'Failed to get submission overview' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { pathname } = new URL(req.url!, `http://${req.headers.host}`);
  const pathParts = pathname.split('/').filter(Boolean);
  
  try {
    // Handle /api/time-entries routes
    if (pathParts[1] === 'time-entries') {
      const timeEntryId = pathParts[2];
      
      if (!timeEntryId) {
        // /api/time-entries
        switch (req.method) {
          case 'GET':
            return await handleGetTimeEntries(req, res);
          case 'POST':
            return await handleCreateTimeEntry(req, res);
          default:
            return res.status(405).json({ message: 'Method not allowed' });
        }
      } else {
        // /api/time-entries/:id
        switch (req.method) {
          case 'PUT':
            return await handleUpdateTimeEntry(req, res, timeEntryId);
          default:
            return res.status(405).json({ message: 'Method not allowed' });
        }
      }
    }
    
    // Handle /api/weekly-submissions routes
    if (pathParts[1] === 'weekly-submissions') {
      const subPath = pathParts[2];
      
      if (subPath === 'pending') {
        // /api/weekly-submissions/pending
        if (req.method === 'GET') {
          return await handleGetPendingSubmissions(req, res);
        } else {
          return res.status(405).json({ message: 'Method not allowed' });
        }
      } else if (!subPath) {
        // /api/weekly-submissions
        switch (req.method) {
          case 'GET':
            return await handleGetWeeklySubmissions(req, res);
          case 'POST':
            return await handleCreateWeeklySubmission(req, res);
          default:
            return res.status(405).json({ message: 'Method not allowed' });
        }
      }
    }
    
    // Handle /api/time-logging routes
    if (pathParts[1] === 'time-logging') {
      const action = pathParts[2];
      
      if (action === 'submit') {
        // /api/time-logging/submit/:resourceId/:weekStartDate
        const resourceId = pathParts[3];
        const weekStartDate = pathParts[4];
        
        if (req.method === 'POST' && resourceId && weekStartDate) {
          return await handleSubmitTimesheet(req, res, resourceId, weekStartDate);
        } else {
          return res.status(400).json({ message: 'Invalid submit request' });
        }
      } else if (action === 'submission-overview') {
        // /api/time-logging/submission-overview
        if (req.method === 'GET') {
          return await handleGetSubmissionOverview(req, res);
        } else {
          return res.status(405).json({ message: 'Method not allowed' });
        }
      }
    }
    
    return res.status(404).json({ message: 'Not found' });
  } catch (error) {
    console.error('Time logging API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
