const User = require('../models/User');
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const Workload = require('../models/Workload');
const FacultyCourseAssignment = require('../models/FacultyCourseAssignment');
const { v4: uuidv4 } = require('uuid');

const facultyController = {
  // Populate FacultyCourseAssignment collection from existing Faculty data
  populateFacultyAssignments: async (req, res) => {
    try {
      console.log('Starting to populate FacultyCourseAssignment collection...');
      
      // Clear existing assignments
      await FacultyCourseAssignment.deleteMany({});
      console.log('Cleared existing assignments');
      
      const faculty = await Faculty.find({});
      console.log(`Found ${faculty.length} faculty members`);
      
      let totalAssignments = 0;
      
      for (const fac of faculty) {
        if (fac.courseHandled && fac.courseHandled.length > 0) {
          for (const course of fac.courseHandled) {
            try {
              // Get course details from Course collection
              const courseDoc = await Course.findOne({ code: course.courseCode });
              
              if (courseDoc) {
                const assignment = new FacultyCourseAssignment({
                  facultyId: fac._id,
                  facultyName: fac.name,
                  courseCode: course.courseCode,
                  courseName: courseDoc.name,
                  semester: courseDoc.semester,
                  role: course.role,
                  batch: course.batch,
                  department: courseDoc.department,
                  courseType: courseDoc.type
                });
                
                await assignment.save();
                totalAssignments++;
              } else {
                console.warn(`Course not found for code: ${course.courseCode}`);
              }
            } catch (error) {
              console.error(`Error processing assignment for ${fac.name} - ${course.courseCode}:`, error);
            }
          }
        }
      }
      
      console.log(`Successfully populated ${totalAssignments} faculty course assignments`);
      res.json({ 
        message: 'Faculty course assignments populated successfully',
        totalAssignments,
        totalFaculty: faculty.length
      });
    } catch (error) {
      console.error('Error populating faculty assignments:', error);
      res.status(500).json({ message: 'Error populating faculty assignments' });
    }
  },

  // Get all faculty members
  getAllFaculty: async (req, res) => {
    try {
      console.log('Fetching all faculty members...');
      
      // Get all faculty from Faculty collection with courseHandled data
      const faculty = await Faculty.find({})
        .select('_id name phone designation freeHours courseHandled')
        .sort({ name: 1 });
      
      console.log(`Found ${faculty.length} faculty members`);
      
      // Log each faculty member and their course data
      faculty.forEach(fac => {
        console.log(`Faculty: ${fac.name}`);
        console.log(`Course handled count: ${fac.courseHandled ? fac.courseHandled.length : 0}`);
        if (fac.courseHandled && fac.courseHandled.length > 0) {
          fac.courseHandled.forEach(course => {
            console.log(`  - ${course.courseCode} (${course.role}) - Batch ${course.batch}`);
          });
        }
      });
      
      res.json(faculty);
    } catch (error) {
      console.error('Error fetching faculty:', error);
      res.status(500).json({ message: 'Error fetching faculty members' });
    }
  },

  // Add a new faculty member
  addFaculty: async (req, res) => {
    try {
      const { name, email, department, subjects } = req.body;
      
      // Check if faculty with email already exists
      const existingFaculty = await User.findOne({ email });
      if (existingFaculty) {
        return res.status(400).json({ message: 'Faculty with this email already exists' });
      }

      const faculty = new User({
        name,
        email,
        password: 'defaultPassword123', // This should be changed by the faculty member
        role: 'faculty',
        department,
        subjects: subjects || [],
        status: 'active'
      });

      const savedFaculty = await faculty.save();
      res.status(201).json(savedFaculty);
    } catch (error) {
      console.error('Error adding faculty:', error);
      res.status(400).json({ message: error.message });
    }
  },

  // Update faculty member
  updateFaculty: async (req, res) => {
    try {
      const { name, department, subjects } = req.body;
      const faculty = await User.findByIdAndUpdate(
        req.params.id,
        { name, department, subjects },
        { new: true, runValidators: true }
      );
      
      if (!faculty) {
        return res.status(404).json({ message: 'Faculty member not found' });
      }
      
      res.json(faculty);
    } catch (error) {
      console.error('Error updating faculty:', error);
      res.status(400).json({ message: error.message });
    }
  },

  // Delete faculty member
  deleteFaculty: async (req, res) => {
    try {
      const faculty = await User.findByIdAndDelete(req.params.id);
      if (!faculty) {
        return res.status(404).json({ message: 'Faculty member not found' });
      }
      res.json({ message: 'Faculty member deleted successfully' });
    } catch (error) {
      console.error('Error deleting faculty:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Get available UG courses for faculty
  getAvailableCourses: async (req, res) => {
    try {
      // Get faculty's department

      // Fetch courses from the faculty's department
      const courses = await Course.find({ 
        department: faculty.department,
        type: 'UG',
        status: 'active'
      })
      .select('name code credits type department semester')
      .sort({ code: 1 });

      res.json(courses);
    } catch (error) {
      console.error('Error fetching available courses:', error);
      res.status(500).json({ message: 'Error fetching available courses' });
    }
  },

  // Submit course preferences
  submitCoursePreferences: async (req, res) => {
    try {
      const { courseIds } = req.body;
      const facultyId = req.user.id;

      // Validate course count
      if (courseIds.length > 6) {
        return res.status(400).json({ 
          message: 'Cannot select more than 6 courses' 
        });
      }

      // Get faculty details
      const faculty = await User.findById(facultyId);
      if (!faculty) {
        return res.status(404).json({ message: 'Faculty not found' });
      }

      // Update preferences for each course
      for (let i = 0; i < courseIds.length; i++) {
        const courseId = courseIds[i];
        const course = await Course.findById(courseId);
        
        if (!course) {
          return res.status(404).json({ 
            message: `Course with ID ${courseId} not found` 
          });
        }

        // Check if faculty already has a preference for this course
        const existingPreference = course.facultyPreferences.find(
          pref => pref.faculty.toString() === facultyId
        );

        if (existingPreference) {
          // Update existing preference
          existingPreference.preferenceOrder = i + 1;
          existingPreference.status = 'pending';
        } else {
          // Add new preference
          course.facultyPreferences.push({
            faculty: facultyId,
            preferenceOrder: i + 1,
            status: 'pending'
          });
        }

        // If this is the first preference, update assignedFaculty
        if (i === 0) {
          course.assignedFaculty = facultyId;
        }

        await course.save();
      }

      res.json({ message: 'Course preferences submitted successfully' });
    } catch (error) {
      console.error('Error submitting course preferences:', error);
      res.status(500).json({ message: 'Error submitting course preferences' });
    }
  },

  // Get faculty's course preferences
  getCoursePreferences: async (req, res) => {
    try {
      const facultyId = req.user.id;
      
      const courses = await Course.find({
        'facultyPreferences.faculty': facultyId
      })
      .populate('assignedFaculty', 'name email')
      .select('name code credits type department semester facultyPreferences assignedFaculty');

      // Sort preferences by order
      const preferences = courses.map(course => {
        const preference = course.facultyPreferences.find(
          pref => pref.faculty.toString() === facultyId
        );
        return {
          course,
          preferenceOrder: preference.preferenceOrder,
          status: preference.status
        };
      }).sort((a, b) => a.preferenceOrder - b.preferenceOrder);

      res.json(preferences);
    } catch (error) {
      console.error('Error fetching course preferences:', error);
      res.status(500).json({ message: 'Error fetching course preferences' });
    }
  },

  // Get all course assignments for HOD view
  getCourseAssignments: async (req, res) => {
    try {
      const courses = await Course.find({
        type: 'UG',
        'facultyPreferences.0': { $exists: true }
      })
      .populate('assignedFaculty', 'name email department')
      .populate('facultyPreferences.faculty', 'name email department')
      .select('name code credits type department semester facultyPreferences assignedFaculty')
      .sort({ code: 1 });

      const assignments = courses.map(course => ({
        course: {
          code: course.code,
          name: course.name,
          department: course.department,
          credits: course.credits,
          semester: course.semester
        },
        assignedFaculty: course.assignedFaculty,
        allPreferences: course.facultyPreferences
          .sort((a, b) => a.preferenceOrder - b.preferenceOrder)
          .map(pref => ({
            faculty: pref.faculty,
            preferenceOrder: pref.preferenceOrder,
            status: pref.status
          }))
      }));

      res.json(assignments);
    } catch (error) {
      console.error('Error fetching course assignments:', error);
      res.status(500).json({ message: 'Error fetching course assignments' });
    }
  },

  registerFaculty: async (req, res) => {
    try {
      const { name, phone, designation, preferredCourses } = req.body;
      if (!name || !phone || !designation || !preferredCourses || preferredCourses.length !== 6) {
        return res.status(400).json({ message: 'All fields are required and 6 courses must be selected.' });
      }
      const allocatedCourse = preferredCourses[0];
      const faculty = new Faculty({ name, phone, designation, preferredCourses, allocatedCourse });
      await faculty.save();
      res.status(201).json(faculty);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getUGCourses: async (req, res) => {
    try {
      const courses = await Course.find({ level: 'UG' });
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Store/check faculty name in faculties collection
  storeFacultyName: async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: 'Faculty name is required' });
      let faculty = await Faculty.findOne({ name });
      if (!faculty) {
        faculty = new Faculty({ name, phone: 'N/A', designation: 'Assistant Professor', preferredCourses: [], allocatedCourse: '' });
        await faculty.save();
      }
      res.json({ success: true, faculty });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get assignments by faculty ID
  getAssignmentsByFaculty: async (req, res) => {
    try {
      const { facultyId } = req.params;
      const assignments = await FacultyCourseAssignment.find({ facultyId })
        .sort({ courseCode: 1 });
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching faculty assignments:', error);
      res.status(500).json({ message: 'Error fetching faculty assignments' });
    }
  },

  // Get assignments by course code
  getAssignmentsByCourse: async (req, res) => {
    try {
      const { courseCode } = req.params;
      const assignments = await FacultyCourseAssignment.find({ courseCode })
        .populate('facultyId', 'name phone designation')
        .sort({ facultyName: 1 });
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching course assignments:', error);
      res.status(500).json({ message: 'Error fetching course assignments' });
    }
  },

  // Get assignments by batch
  getAssignmentsByBatch: async (req, res) => {
    try {
      const { batch } = req.params;
      const assignments = await FacultyCourseAssignment.find({ batch })
        .populate('facultyId', 'name phone designation')
        .sort({ courseCode: 1 });
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching batch assignments:', error);
      res.status(500).json({ message: 'Error fetching batch assignments' });
    }
  },

  // Create new faculty course assignment
  createAssignment: async (req, res) => {
    try {
      const {
        facultyId,
        facultyName,
        courseCode,
        courseName,
        semester,
        role,
        batch,
        department,
        courseType
      } = req.body;

      // Validate required fields
      if (!facultyId || !facultyName || !courseCode || !courseName || !semester || !role || !batch || !department || !courseType) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Check if assignment already exists
      const existingAssignment = await FacultyCourseAssignment.findOne({
        facultyId,
        courseCode,
        batch,
        role
      });

      if (existingAssignment) {
        return res.status(400).json({ message: 'Assignment already exists for this faculty, course, batch, and role combination' });
      }

      const assignment = new FacultyCourseAssignment({
        facultyId,
        facultyName,
        courseCode,
        courseName,
        semester,
        role,
        batch,
        department,
        courseType
      });

      await assignment.save();
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({ message: 'Error creating assignment' });
    }
  },

  // Update faculty course assignment
  updateAssignment: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Find the existing assignment
      const existingAssignment = await FacultyCourseAssignment.findById(id);
      if (!existingAssignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      // Update the assignment in FacultyCourseAssignment
      const assignment = await FacultyCourseAssignment.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      // Update the corresponding entry in Faculty's courseHandled array
      await Faculty.updateOne(
        { _id: existingAssignment.facultyId, "courseHandled.courseCode": existingAssignment.courseCode, "courseHandled.role": existingAssignment.role, "courseHandled.batch": existingAssignment.batch },
        {
          $set: {
            "courseHandled.$.courseCode": updateData.courseCode || existingAssignment.courseCode,
            "courseHandled.$.role": updateData.role || existingAssignment.role,
            "courseHandled.$.batch": updateData.batch || existingAssignment.batch
          }
        }
      );

      res.json(assignment);
    } catch (error) {
      console.error('Error updating assignment:', error);
      res.status(500).json({ message: 'Error updating assignment' });
    }
  },

  // Delete faculty course assignment
  deleteAssignment: async (req, res) => {
    try {
      const { id } = req.params;
      // Find the assignment to get facultyId, courseCode, role, batch
      const assignment = await FacultyCourseAssignment.findByIdAndDelete(id);

      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      // Remove the corresponding entry from Faculty's courseHandled array
      await Faculty.updateOne(
        { _id: assignment.facultyId },
        {
          $pull: {
            courseHandled: {
              courseCode: assignment.courseCode,
              role: assignment.role,
              batch: assignment.batch
            }
          }
        }
      );

      res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      res.status(500).json({ message: 'Error deleting assignment' });
    }
  },

  // Get all assignments with pagination and filtering
  getAllAssignments: async (req, res) => {
    try {
      const { page = 1, limit = 50, facultyName, courseCode, batch, role, department } = req.query;
      
      const filter = {};
      if (facultyName) filter.facultyName = new RegExp(facultyName, 'i');
      if (courseCode) filter.courseCode = new RegExp(courseCode, 'i');
      if (batch) filter.batch = new RegExp(batch, 'i');
      if (role) filter.role = role;
      if (department) filter.department = new RegExp(department, 'i');

      const assignments = await FacultyCourseAssignment.find(filter)
        .populate('facultyId', 'name phone designation')
        .sort({ facultyName: 1, courseCode: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await FacultyCourseAssignment.countDocuments(filter);

      res.json({
        assignments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ message: 'Error fetching assignments' });
    }
  },

  // Get faculty assignments for specific semester and course type
  getFacultyAssignmentsForSemester: async (req, res) => {
    try {
      const { semester, courseType } = req.params;
      
      const assignments = await FacultyCourseAssignment.find({
        semester: String(semester),
        courseType: courseType
      }).sort({ facultyName: 1, courseCode: 1, batch: 1 });
      
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching faculty assignments for semester:', error);
      res.status(500).json({ message: 'Error fetching faculty assignments for semester' });
    }
  },

  // Get faculty assignments for specific course and batch
  getFacultyAssignmentsForCourseBatch: async (req, res) => {
    try {
      const { courseCode, courseName, batch, semester } = req.query;
      
      const filter = {};
      if (semester) filter.semester = String(semester);
      if (batch) filter.batch = batch;
      
      // Build course filter - try course code first, then course name
      if (courseCode) {
        filter.courseCode = courseCode;
      } else if (courseName) {
        filter.courseName = courseName;
      }
      
      const assignments = await FacultyCourseAssignment.find(filter)
        .sort({ facultyName: 1 });
      
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching faculty assignments for course/batch:', error);
      res.status(500).json({ message: 'Error fetching faculty assignments for course/batch' });
    }
  },

  // Get all faculty assignments for timetable builder (no pagination)
  getAllFacultyAssignmentsForTimetable: async (req, res) => {
    try {
      const assignments = await FacultyCourseAssignment.find({})
        .sort({ facultyName: 1, courseCode: 1, batch: 1 });
      
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching all faculty assignments for timetable:', error);
      res.status(500).json({ message: 'Error fetching faculty assignments for timetable' });
    }
  },

  // Get faculty course assignments for dashboard
  getFacultyCourseAssignments: async (req, res) => {
    try {
      const { facultyName } = req.query;
      
      if (!facultyName) {
        return res.status(400).json({ message: 'Faculty name is required' });
      }

      console.log(`Fetching course assignments for faculty: ${facultyName}`);
      
      // Find assignments for the specific faculty
      const assignments = await FacultyCourseAssignment.find({ 
        facultyName: facultyName 
      }).sort({ courseCode: 1 });

      console.log(`Found ${assignments.length} assignments for ${facultyName}`);

      // Format the response
      const formattedAssignments = assignments.map(assignment => ({
        courseCode: assignment.courseCode,
        courseName: assignment.courseName,
        semester: assignment.semester,
        role: assignment.role,
        batch: assignment.batch,
        department: assignment.department,
        courseType: assignment.courseType
      }));

      res.json({
        facultyName: facultyName,
        assignments: formattedAssignments,
        totalAssignments: formattedAssignments.length
      });
    } catch (error) {
      console.error('Error fetching faculty course assignments:', error);
      res.status(500).json({ message: 'Error fetching faculty course assignments' });
    }
  },

  // Get all faculty course assignments (for admin/HOD view)
  getAllFacultyCourseAssignments: async (req, res) => {
    try {
      console.log('Fetching all faculty course assignments...');
      
      const assignments = await FacultyCourseAssignment.find({})
        .sort({ facultyName: 1, courseCode: 1 });

      console.log(`Found ${assignments.length} total assignments`);

      res.json({
        assignments: assignments,
        totalAssignments: assignments.length
      });
    } catch (error) {
      console.error('Error fetching all faculty course assignments:', error);
      res.status(500).json({ message: 'Error fetching faculty course assignments' });
    }
  },

  // Get faculty course assignments by faculty name
  getFacultyCourseAssignmentsByName: async (req, res) => {
    try {
      const { name } = req.query;
      
      if (!name) {
        return res.status(400).json({ message: 'Faculty name is required' });
      }

      console.log(`Fetching course assignments for faculty: ${name}`);
      
      // Find faculty by name in the faculties collection
      const faculty = await Faculty.findOne({ name: name });
      
      if (!faculty) {
        return res.status(404).json({ message: 'Faculty not found' });
      }

      console.log(`Found faculty: ${faculty.name}`);
      console.log(`Course handled: ${faculty.courseHandled ? faculty.courseHandled.length : 0} courses`);

      // Return the courseHandled data from the faculty document
      res.json({
        facultyName: faculty.name,
        courseHandled: faculty.courseHandled || [],
        totalCourses: faculty.courseHandled ? faculty.courseHandled.length : 0
      });
    } catch (error) {
      console.error('Error fetching faculty course assignments:', error);
      res.status(500).json({ message: 'Error fetching faculty course assignments' });
    }
  }
};

// Add a faculty with multiple courses/roles/batches (manual entry)
const addFacultyWithCourses = async (req, res) => {
  try {
    const { name, courses, facultyId } = req.body;
    if (!name || !Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ message: 'Name and at least one course are required.' });
    }
    // Check for duplicate
    const exists = await Faculty.findOne({ name });
    if (exists) {
      return res.status(400).json({ message: 'Faculty with this name already exists.' });
    }
    const faculty = new Faculty({ name, courses, facultyId: facultyId || uuidv4() });
    await faculty.save();
    res.status(201).json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk add faculties from Excel upload
const bulkAddFacultiesFromExcel = async (req, res) => {
  try {
    const { faculties } = req.body;
    if (!Array.isArray(faculties)) {
      return res.status(400).json({ message: 'Faculties array is required.' });
    }
    let inserted = 0;
    let skipped = 0;
    for (const record of faculties) {
      const { name, courses, facultyId } = record;
      if (!name || !Array.isArray(courses) || courses.length === 0) {
        skipped++;
        continue;
      }
      const exists = await Faculty.findOne({ name });
      if (!exists) {
        await Faculty.create({ name, courses, facultyId: facultyId || uuidv4() });
        inserted++;
      } else {
        skipped++;
      }
    }
    res.json({ message: `Inserted ${inserted} faculties, skipped ${skipped} (duplicates or invalid).` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get faculty summary (total count)
const getFacultySummary = async (req, res) => {
  try {
    const count = await Faculty.countDocuments();
    res.json({ totalFaculties: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk add/update workloads from Excel upload
const addWorkloadExcel = async (req, res) => {
  try {
    const { workloads } = req.body;
    if (!Array.isArray(workloads)) {
      return res.status(400).json({ message: 'Workloads array is required.' });
    }
    let inserted = 0;
    let updated = 0;
    for (const record of workloads) {
      const { faculty, freeHours } = record;
      if (!faculty || !freeHours) continue;
      const existing = await Workload.findOne({ faculty });
      if (existing) {
        await Workload.updateOne({ faculty }, { freeHours });
        updated++;
      } else {
        await Workload.create({ faculty, freeHours });
        inserted++;
      }
    }
    res.json({ message: `Inserted ${inserted}, updated ${updated} workloads.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Faculty Timetable Viewer API
const getFacultyTimetableViewer = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ message: 'Faculty name is required' });
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const TIME_SLOTS = ['08:30-09:20', '09:25-10:15', '10:30-11:20', '11:25-12:15', '01:10-02:00', '02:05-02:55', '03:00-03:50', '03:55-04:45'];
    // Initialize empty timetable structure
    const facultyTimetable = {};
    DAYS.forEach(day => {
      facultyTimetable[day] = {};
      TIME_SLOTS.forEach(slot => {
        facultyTimetable[day][slot] = null;
      });
    });
    // Fetch all timetables
    const Timetable = require('../models/Timetable');
    const timetables = await Timetable.find({});
    timetables.forEach(tt => {
      const { batch, timetable } = tt;
      if (!timetable || typeof timetable !== 'object') return;
      DAYS.forEach(day => {
        if (!timetable[day] || typeof timetable[day] !== 'object') return;
        TIME_SLOTS.forEach(slot => {
          const period = timetable[day][slot];
          if (
            period &&
            typeof period === 'object' &&
            period.faculty &&
            typeof period.faculty === 'string' &&
            period.faculty.replace(/\s+/g, ' ').trim().toLowerCase() === name.replace(/\s+/g, ' ').trim().toLowerCase()
          ) {
            // Place the period in the facultyTimetable structure
            facultyTimetable[day][slot] = {
              ...period,
              batch: batch,
              day: day,
              slot: slot
            };
          }
        });
      });
    });
    return res.status(200).json({ timetable: facultyTimetable });
  } catch (error) {
    console.error('Error in getFacultyTimetableViewer:', error);
    return res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};

// Sync a faculty's assignments to facultycourseassignments collection
const syncFacultyAssignments = async (req, res) => {
  try {
    const { facultyId, facultyName } = req.body;
    let faculty;
    if (facultyId) {
      faculty = await Faculty.findById(facultyId);
    } else if (facultyName) {
      faculty = await Faculty.findOne({ name: facultyName });
    } else {
      return res.status(400).json({ message: 'facultyId or facultyName is required' });
    }
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    let upserted = 0;
    for (const course of faculty.courseHandled || []) {
      await FacultyCourseAssignment.findOneAndUpdate(
        {
          facultyId: faculty._id,
          courseCode: course.courseCode,
          role: course.role,
          batch: course.batch
        },
        {
          facultyId: faculty._id,
          facultyName: faculty.name,
          courseCode: course.courseCode,
          courseName: course.courseName || '',
          semester: course.semester ? String(course.semester) : '',
          role: course.role,
          batch: course.batch,
          department: faculty.department || '',
          courseType: course.courseType || '',
          updatedAt: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      upserted++;
    }
    res.json({ message: `Synced ${upserted} assignments for faculty ${faculty.name}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Sync all faculties' assignments to facultycourseassignments collection
const syncAllFacultyAssignments = async (req, res) => {
  try {
    await FacultyCourseAssignment.deleteMany({});
    const faculties = await Faculty.find({});
    let upserted = 0;
    for (const faculty of faculties) {
      for (const courseHandled of faculty.courseHandled || []) {
        // Fetch course details from Course collection
        const courseDoc = await Course.findOne({ code: courseHandled.courseCode });
        await FacultyCourseAssignment.findOneAndUpdate(
          {
            facultyId: faculty._id,
            courseCode: courseHandled.courseCode,
            role: courseHandled.role,
            batch: courseHandled.batch
          },
          {
            facultyId: faculty._id,
            facultyName: faculty.name,
            courseCode: courseHandled.courseCode,
            courseName: courseDoc ? courseDoc.name : '',
            semester: courseDoc ? courseDoc.semester : '',
            role: courseHandled.role,
            batch: courseHandled.batch,
            department: courseDoc ? courseDoc.department : '',
            courseType: courseDoc ? courseDoc.type : '',
            updatedAt: new Date()
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        upserted++;
      }
    }
    if (res) {
      res.json({ message: `Synced ${upserted} assignments for all faculties.` });
    }
  } catch (err) {
    if (res) {
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = {
  ...facultyController,
  addFacultyWithCourses,
  bulkAddFacultiesFromExcel,
  getFacultySummary,
  addWorkloadExcel,
  getFacultyTimetableViewer,
  syncFacultyAssignments,
  syncAllFacultyAssignments
}; 