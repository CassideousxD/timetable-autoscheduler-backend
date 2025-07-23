const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/timetable-management';

const defaultUsers = [
    {
        name: 'Admin',
        email: 'admin@timetable.com',
        password: 'timetable123',
        role: 'admin',
        department: 'General',
    },
    {
        name: 'HOD',
        email: 'hod@timetable.com',
        password: 'timetable123',
        role: 'hod',
        department: 'General',
    },
    {
        name: 'Timetable Coordinator',
        email: 'coordinator@timetable.com',
        password: 'timetable123',
        role: 'timetable_coordinator',
        department: 'General',
    },
];

async function insertDefaults() {
    await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    for (const user of defaultUsers) {
        const exists = await User.findOne({ email: user.email });
        if (!exists) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await User.create({
                ...user,
                password: hashedPassword,
                subjects: [],
                status: 'active',
                userId: uuidv4(),
            });
            console.log(`Inserted default user: ${user.email}`);
        } else {
            console.log(`User already exists: ${user.email}`);
        }
    }
    await mongoose.disconnect();
    console.log('Done.');
}

insertDefaults().catch(err => {
    console.error(err);
    process.exit(1);
}); 