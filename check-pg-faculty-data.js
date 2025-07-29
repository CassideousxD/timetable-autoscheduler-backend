const mongoose = require('mongoose');
const FacultyCourseAssignment = require('./models/FacultyCourseAssignment');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/timetable-management', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function checkPGFacultyData() {
    try {
        console.log('Checking PG faculty assignment data...\n');

        // Get all faculty assignments
        const allAssignments = await FacultyCourseAssignment.find({});
        console.log(`Total faculty assignments: ${allAssignments.length}`);

        // Get PG assignments
        const pgAssignments = await FacultyCourseAssignment.find({ courseType: 'PG' });
        console.log(`PG faculty assignments: ${pgAssignments.length}`);

        if (pgAssignments.length > 0) {
            console.log('\nPG Assignments found:');
            pgAssignments.forEach((assignment, index) => {
                console.log(`${index + 1}. ${assignment.facultyName} -> ${assignment.courseCode} (${assignment.courseName}) - ${assignment.batch} - ${assignment.role} - Semester: ${assignment.semester}`);
            });
        } else {
            console.log('\nNo PG assignments found. Creating sample data...');

            // Create sample PG faculty assignments for testing
            const sampleAssignments = [
                {
                    facultyId: new mongoose.Types.ObjectId(),
                    facultyName: 'Dr. John Smith',
                    courseCode: 'CP3251',
                    courseName: 'Advanced Operating Systems',
                    semester: '2',
                    role: 'Theory Teacher',
                    batch: 'PG',
                    department: 'Computer Science',
                    courseType: 'PG'
                },
                {
                    facultyId: new mongoose.Types.ObjectId(),
                    facultyName: 'Dr. John Smith',
                    courseCode: 'CP3251',
                    courseName: 'Advanced Operating Systems',
                    semester: '2',
                    role: 'Lab Incharge',
                    batch: 'PG',
                    department: 'Computer Science',
                    courseType: 'PG'
                },
                {
                    facultyId: new mongoose.Types.ObjectId(),
                    facultyName: 'Dr. Jane Doe',
                    courseCode: 'CP3201',
                    courseName: 'Compiler Optimization Techniques',
                    semester: '2',
                    role: 'Theory Teacher',
                    batch: 'PG',
                    department: 'Computer Science',
                    courseType: 'PG'
                },
                {
                    facultyId: new mongoose.Types.ObjectId(),
                    facultyName: 'Dr. Jane Doe',
                    courseCode: 'CP3201',
                    courseName: 'Compiler Optimization Techniques',
                    semester: '2',
                    role: 'Lab Incharge',
                    batch: 'PG',
                    department: 'Computer Science',
                    courseType: 'PG'
                },
                {
                    facultyId: new mongoose.Types.ObjectId(),
                    facultyName: 'Dr. Bob Wilson',
                    courseCode: 'BD3201',
                    courseName: 'Big Data Query Languages',
                    semester: '2',
                    role: 'Theory Teacher',
                    batch: 'PG',
                    department: 'Data Science',
                    courseType: 'PG'
                },
                {
                    facultyId: new mongoose.Types.ObjectId(),
                    facultyName: 'Dr. Bob Wilson',
                    courseCode: 'BD3201',
                    courseName: 'Big Data Query Languages',
                    semester: '2',
                    role: 'Lab Incharge',
                    batch: 'PG',
                    department: 'Data Science',
                    courseType: 'PG'
                },
                {
                    facultyId: new mongoose.Types.ObjectId(),
                    facultyName: 'Dr. Alice Brown',
                    courseCode: 'CP3061',
                    courseName: 'Devops and Microservices',
                    semester: '2',
                    role: 'Theory Teacher',
                    batch: 'PG',
                    department: 'Computer Science',
                    courseType: 'PG'
                },
                {
                    facultyId: new mongoose.Types.ObjectId(),
                    facultyName: 'Dr. Charlie Davis',
                    courseCode: 'BD3051',
                    courseName: 'Foundations of Data Science',
                    semester: '2',
                    role: 'Theory Teacher',
                    batch: 'PG',
                    department: 'Data Science',
                    courseType: 'PG'
                },
                {
                    facultyId: new mongoose.Types.ObjectId(),
                    facultyName: 'Dr. Eve Johnson',
                    courseCode: 'BD3003',
                    courseName: 'Data Visualization',
                    semester: '2',
                    role: 'Theory Teacher',
                    batch: 'PG',
                    department: 'Data Science',
                    courseType: 'PG'
                },
                {
                    facultyId: new mongoose.Types.ObjectId(),
                    facultyName: 'Dr. Frank Miller',
                    courseCode: 'CP3060',
                    courseName: 'Deep Learning',
                    semester: '2',
                    role: 'Theory Teacher',
                    batch: 'PG',
                    department: 'Computer Science',
                    courseType: 'PG'
                },
                {
                    facultyId: new mongoose.Types.ObjectId(),
                    facultyName: 'Dr. Frank Miller',
                    courseCode: 'CP3060',
                    courseName: 'Deep Learning',
                    semester: '2',
                    role: 'Lab Incharge',
                    batch: 'PG',
                    department: 'Computer Science',
                    courseType: 'PG'
                }
            ];

            // Insert sample assignments
            for (const assignment of sampleAssignments) {
                const newAssignment = new FacultyCourseAssignment(assignment);
                await newAssignment.save();
                console.log(`Created assignment: ${assignment.facultyName} -> ${assignment.courseCode} (${assignment.role})`);
            }

            console.log(`\nCreated ${sampleAssignments.length} sample PG faculty assignments.`);
        }

        // Check semester 2 assignments specifically
        const semester2Assignments = await FacultyCourseAssignment.find({ semester: '2' });
        console.log(`\nSemester 2 assignments: ${semester2Assignments.length}`);

        if (semester2Assignments.length > 0) {
            console.log('Semester 2 assignments:');
            semester2Assignments.forEach((assignment, index) => {
                console.log(`${index + 1}. ${assignment.facultyName} -> ${assignment.courseCode} - ${assignment.batch} - ${assignment.role} - Type: ${assignment.courseType}`);
            });
        }

    } catch (error) {
        console.error('Error checking PG faculty data:', error);
    } finally {
        mongoose.connection.close();
    }
}

checkPGFacultyData(); 