const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-Memory Database Arrays
const membersDatabase = [
    {
        firstName: "Sudhanshu",
        lastName: "Singh",
        dob: "2007-02-18",
        age: "19",
        gender: "Male",
        height: "175",
        weight: "70",
        bmi: "22.9",
        secretWord: "resha",
        username: "9045319055",
        password: "1802resh",
        planCategory: "Yearly Membership",
        planStart: "2026-06-01",
        planExpiry: "2027-06-01",
        hasPT: "Yes",
        trainerName: "Coach Vikram",
        paymentMode: "Online"
    }
];

const adminDatabase = [
    { username: 'HIMANSHU', password: 'himanshugym@123', role: 'Gym Owner' },
    { username: 'sudhanshu', password: 'Resha@2028', role: 'Website Owner' }
];

// Helper formula to compute physiological BMI scores
function calculateBMIScore(heightCm, weightKg) {
    if (!heightCm || !weightKg || isNaN(heightCm) || isNaN(weightKg)) return "N/A";
    const heightMeters = parseFloat(heightCm) / 100;
    if (heightMeters === 0) return "N/A";
    const bmiVal = parseFloat(weightKg) / (heightMeters * heightMeters);
    return bmiVal.toFixed(1);
}

// Helper password formula configuration (DDMM****)
function generateCustomPassword(dob, secretWord) {
    const parts = dob.split('-');
    let day = "01", month = "01";
    if (parts.length === 3) {
        if (parts[0].length === 4) { // YYYY-MM-DD
            day = parts[2]; month = parts[1];
        } else { // DD-MM-YYYY
            day = parts[0]; month = parts[1];
        }
    }
    const cleanSecret = secretWord.replace(/\s+/g, '').substring(0, 4).toLowerCase();
    return `${day}${month}${cleanSecret}`;
}

// MEMBER PIPELINE: Register profile route
app.post('/api/member/register', (req, res) => {
    const { firstName, lastName, dob, age, gender, height, weight, mobileNumber, secretWord } = req.body;
    if (!firstName || !lastName || !dob || !age || !gender || !mobileNumber || !secretWord) {
        return res.status(400).json({ success: false, message: 'Mandatory registration elements missing.' });
    }

    if (membersDatabase.find(m => m.username === mobileNumber)) {
        return res.status(400).json({ success: false, message: 'Mobile number registered under an existing profile.' });
    }

    const calculatedBmi = calculateBMIScore(height, weight);
    const generatedPassword = generateCustomPassword(dob, secretWord);

    const newMember = {
        firstName, lastName, dob, age, gender,
        height: height || "N/A",
        weight: weight || "N/A",
        bmi: calculatedBmi,
        secretWord,
        username: mobileNumber,
        password: generatedPassword,
        planCategory: "Not Assigned",
        planStart: "N/A",
        planExpiry: "N/A",
        hasPT: "No",
        trainerName: "None",
        paymentMode: "N/A"
    };

    membersDatabase.push(newMember);
    res.status(201).json({ success: true, message: 'Registration successfully initialized!' });
});

// MEMBER PIPELINE: Login verification routing
app.post('/api/member/login', (req, res) => {
    const { username, password } = req.body;
    const member = membersDatabase.find(m => m.username === username && m.password === password);
    if (member) return res.status(200).json({ success: true, member });
    res.status(400).json({ success: false, message: 'Invalid Member Credentials.' });
});

// ADMIN PIPELINE: Login routing
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const admin = adminDatabase.find(a => a.username === username && a.password === password);
    if (admin) return res.status(200).json({ success: true, message: `Access granted: ${admin.role}`, role: admin.role });
    res.status(400).json({ success: false, message: 'Invalid Admin Credentials.' });
});

// DASHBOARD PIPELINE: Read operation dataset
app.get('/api/admin/data', (req, res) => {
    res.status(200).json({ success: true, members: membersDatabase, admins: adminDatabase });
});

// DASHBOARD PIPELINE: Add custom staff profile
app.post('/api/admin/add-admin', (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ success: false, message: 'All inputs mandatory.' });
    
    if (adminDatabase.find(a => a.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Staff profile entry exists.' });
    }

    adminDatabase.push({ username, password, role });
    res.status(201).json({ success: true, message: 'Staff credentials authorized.' });
});

// DASHBOARD PIPELINE: Comprehensive structural profile updates
app.post('/api/admin/update-member-full', (req, res) => {
    const { username, password, planCategory, planStart, planExpiry, hasPT, trainerName, paymentMode } = req.body;
    const member = membersDatabase.find(m => m.username === username);
    if (!member) return res.status(404).json({ success: false, message: 'Target record index missing.' });

    // Apply mutable string transformations
    member.password = password; 
    member.planCategory = planCategory;
    member.planStart = planStart;
    member.planExpiry = planExpiry;
    member.hasPT = hasPT;
    member.trainerName = hasPT === "Yes" ? trainerName : "None";
    member.paymentMode = paymentMode;

    res.status(200).json({ success: true, message: 'Configurations committed smoothly.' });
});

// DASHBOARD PIPELINE: Admin password configuration updates
app.post('/api/admin/update-admin-pass', (req, res) => {
    const { username, password } = req.body;
    const admin = adminDatabase.find(a => a.username === username);
    if (!admin) return res.status(404).json({ success: false, message: 'Staff context trace missed.' });

    admin.password = password;
    res.status(200).json({ success: true, message: 'Staff security keys modified.' });
});

// DASHBOARD PIPELINE: Member erasure mutation route
app.delete('/api/admin/member/:username', (req, res) => {
    const index = membersDatabase.findIndex(m => m.username === req.params.username);
    if (index !== -1) {
        membersDatabase.splice(index, 1);
        return res.status(200).json({ success: true, message: 'Member erased.' });
    }
    res.status(404).json({ success: false, message: 'Context missing.' });
});

// DASHBOARD PIPELINE: Admin erasure mutation route
app.delete('/api/admin/manage/:username', (req, res) => {
    const target = req.params.username;
    if (target === 'HIMANSHU' || target === 'sudhanshu') {
        return res.status(400).json({ success: false, message: 'Protected architectural root handles cannot be dropped.' });
    }
    const index = adminDatabase.findIndex(a => a.username === target);
    if (index !== -1) {
        adminDatabase.splice(index, 1);
        return res.status(200).json({ success: true, message: 'Staff profile deleted.' });
    }
    res.status(404).json({ success: false, message: 'Entry missed.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));