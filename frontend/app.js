const BACKEND_URL = 'https://mb-gym.onrender.com/api/login';
let deleteCallback = null;

// View switcher to handle application visibility layout states
function switchView(targetSection) {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('member-login-section').classList.add('hidden');
    document.getElementById('register-section').classList.add('hidden');
    document.getElementById('admin-login-section').classList.add('hidden');
    document.getElementById('member-dashboard').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('alert-box').classList.add('hidden');

    if (['member-login', 'register', 'admin-login'].includes(targetSection)) {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('portal-nav-links').classList.remove('hidden');
        if (targetSection === 'member-login') document.getElementById('member-login-section').classList.remove('hidden');
        if (targetSection === 'register') document.getElementById('register-section').classList.remove('hidden');
        if (targetSection === 'admin-login') document.getElementById('admin-login-section').classList.remove('hidden');
    } else if (targetSection === 'member-dashboard') {
        document.getElementById('member-dashboard').classList.remove('hidden');
        document.getElementById('portal-nav-links').classList.add('hidden'); // Hide links when logged in
    } else if (targetSection === 'admin-dashboard') {
        document.getElementById('admin-dashboard').classList.remove('hidden');
        document.getElementById('portal-nav-links').classList.add('hidden'); // Hide links when logged in
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if(params.get('action') === 'join') switchView('register');
});

function showAlert(message, isError = false) {
    const alertBox = document.getElementById('alert-box');
    alertBox.innerText = message;
    alertBox.className = `mb-4 p-3 rounded text-sm text-center font-bold ${isError ? 'bg-red-900/50 text-red-200 border border-red-700' : 'bg-green-900/50 text-green-200 border border-green-700'}`;
    alertBox.classList.remove('hidden');
}

// Helper to automatically project membership end date based on tier selection package
function calculateExpiryDate(startDateString, planCategory) {
    if (!startDateString || !planCategory || planCategory === "Not Assigned") return "";

    const date = new Date(startDateString);
    if (isNaN(date.getTime())) return ""; 

    let monthsToAdd = 0;
    if (planCategory === "Monthly Membership") monthsToAdd = 1;
    else if (planCategory === "3 monthly") monthsToAdd = 3;
    else if (planCategory === "6 monthly") monthsToAdd = 6;
    else if (planCategory === "YEARLY") monthsToAdd = 12;

    // Advance calendar months smoothly
    date.setMonth(date.getMonth() + monthsToAdd);
    
    // Format back to structural HTML date control string standards (YYYY-MM-DD)
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}`;
}

// TRANSACTION HANDLERS PIPELINES
async function handleRegistration(event) {
    event.preventDefault();
    const payload = {
        firstName: document.getElementById('reg-first').value.trim(),
        lastName: document.getElementById('reg-last').value.trim(),
        dob: document.getElementById('reg-dob').value,
        age: document.getElementById('reg-age').value,
        gender: document.getElementById('reg-gender').value,
        height: document.getElementById('reg-height').value,
        weight: document.getElementById('reg-weight').value,
        mobileNumber: document.getElementById('reg-mobile').value.trim(),
        secretWord: document.getElementById('reg-secret').value.trim()
    };

    try {
        const response = await fetch(`${BACKEND_URL}/member/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.success) {
            alert('Registration complete!');
            switchView('member-login');
            showAlert('Registration initialized! Complete signing in below.');
            event.target.reset();
        } else { showAlert(data.message, true); }
    } catch (e) { showAlert('Sync failure with local backend server.', true); }
}

async function handleMemberLogin(event) {
    event.preventDefault();
    const username = document.getElementById('member-user').value.trim();
    const password = document.getElementById('member-pass').value.trim();

    try {
        const response = await fetch(`${BACKEND_URL}/member/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            const m = data.member;
            document.getElementById('m-dash-welcome').innerText = `WELCOME, ${m.firstName.toUpperCase()} ${m.lastName.toUpperCase()}!`;
            document.getElementById('m-dash-phone').innerText = m.username;
            document.getElementById('m-dash-dob').innerText = m.dob;
            document.getElementById('m-dash-age').innerText = m.age;
            document.getElementById('m-dash-gender').innerText = m.gender;
            document.getElementById('m-dash-height').innerText = m.height;
            document.getElementById('m-dash-weight').innerText = m.weight;
            document.getElementById('m-dash-bmi').innerText = m.bmi;
            document.getElementById('m-dash-cat').innerText = m.planCategory;
            document.getElementById('m-dash-start').innerText = m.planStart;
            document.getElementById('m-dash-expiry').innerText = m.planExpiry;
            document.getElementById('m-dash-haspt').innerText = m.hasPT;
            document.getElementById('m-dash-trainer').innerText = m.trainerName;
            document.getElementById('m-dash-paymode').innerText = m.paymentMode || "N/A";
            
            switchView('member-dashboard');
        } else { showAlert(data.message, true); }
    } catch (e) { showAlert('Member pathway login connection rejected.', true); }
}

async function handleAdminLogin(event) {
    event.preventDefault();
    const username = document.getElementById('admin-user').value.trim();
    const password = document.getElementById('admin-pass').value.trim();

    try {
        const response = await fetch(`${BACKEND_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('admin-role-title').innerText = `Access Privileges Level mapped: ${data.role}`;
            switchView('admin-dashboard');
            loadAdminDashboardData();
        } else { showAlert(data.message, true); }
    } catch (e) { showAlert('Admin execution path verification dropped.', true); }
}

function logout() { switchView('member-login'); }

// REFRESH CONSOLE ENGINE COMPILER
async function loadAdminDashboardData() {
    try {
        const response = await fetch(`${BACKEND_URL}/admin/data`);
        const data = await response.json();
        if (!data.success) return;

        // Build interactive grid rows for registered members
        const mBody = document.getElementById('admin-member-table-body');
        mBody.innerHTML = '';
        data.members.forEach(m => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-zinc-900 hover:bg-zinc-900/20";
            tr.innerHTML = `
                <td class="py-3 pr-2 font-bold text-white leading-tight">
                    <div>${m.firstName} ${m.lastName}</div>
                    <div class="text-[10px] text-zinc-500 font-normal mt-0.5">Age: ${m.age} | ${m.gender}</div>
                    <div class="text-[10px] text-teal-500 font-mono font-normal">H: ${m.height} W: ${m.weight} | BMI: ${m.bmi}</div>
                </td>
                <td class="font-mono text-zinc-400 pr-2">
                    <div>User: ${m.username}</div>
                    <div class="mt-1 flex items-center gap-1">
                        <span class="text-[9px] text-zinc-600 uppercase">Pass:</span>
                        <input type="text" value="${m.password}" id="p-override-${m.username}" class="bg-zinc-900 border border-zinc-800 text-white rounded px-1.5 py-0.5 font-mono text-[10px] w-24 focus:border-yellow-400 focus:outline-none">
                    </div>
                </td>
                <td class="py-2">
                    <form onsubmit="updateMemberPlanFull(event, '${m.username}')" class="flex flex-wrap gap-1.5 items-center bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/80 max-w-xl">
                        <select id="plan-cat-${m.username}" class="bg-zinc-950 px-1.5 py-1 rounded text-[10px] text-white font-bold border border-zinc-800">
                            <option value="Not Assigned" ${m.planCategory === 'Not Assigned' ? 'selected' : ''}>-- Choose Plan --</option>
                            <option value="Monthly Membership" ${m.planCategory === 'Monthly Membership' ? 'selected' : ''}>Monthly Membership</option>
                            <option value="3 monthly" ${m.planCategory === '3 monthly' ? 'selected' : ''}>3 Monthly Package</option>
                            <option value="6 monthly" ${m.planCategory === '6 monthly' ? 'selected' : ''}>6 Monthly Package</option>
                            <option value="YEARLY" ${m.planCategory === 'YEARLY' ? 'selected' : ''}>YEARLY Membership</option>
                        </select>
                        <input type="date" id="plan-start-${m.username}" value="${m.planStart !== 'N/A' ? m.planStart : ''}" required class="bg-zinc-950 px-1 py-1 rounded text-[10px] text-white font-mono border border-zinc-800">
                        <input type="date" id="plan-expiry-${m.username}" value="${m.planExpiry !== 'N/A' ? m.planExpiry : ''}" required class="bg-zinc-950 px-1 py-1 rounded text-[10px] text-white font-mono border border-zinc-800">
                        <select class="bg-zinc-950 px-1 py-1 rounded text-[10px] text-white border border-zinc-800">
                            <option value="No" ${m.hasPT === 'No' ? 'selected' : ''}>No PT</option>
                            <option value="Yes" ${m.hasPT === 'Yes' ? 'selected' : ''}>With PT</option>
                        </select>
                        <input type="text" placeholder="Trainer" value="${m.trainerName !== 'None' ? m.trainerName : ''}" class="bg-zinc-950 px-1.5 py-1 rounded text-[10px] w-16 text-white border border-zinc-800">
                        <select class="bg-zinc-950 px-1.5 py-1 rounded text-[10px] text-yellow-400 border border-zinc-800 font-bold">
                            <option value="N/A" ${m.paymentMode === 'N/A' ? 'selected' : ''}>-- Pay --</option>
                            <option value="Cash" ${m.paymentMode === 'Cash' ? 'selected' : ''}>Cash</option>
                            <option value="Online" ${m.paymentMode === 'Online' ? 'selected' : ''}>Online</option>
                        </select>
                        <button type="submit" class="bg-emerald-700 hover:bg-emerald-600 text-white font-black px-2.5 py-1 rounded text-[9px] uppercase tracking-wide transition">Save</button>
                    </form>
                </td>
                <td class="text-right"><button onclick="openDoubleCheck('${m.firstName} ${m.lastName}', () => deleteMember('${m.username}'))" class="bg-red-950 text-red-400 border border-red-900/60 px-2 py-1 rounded-md hover:bg-red-900 hover:text-white transition">Delete</button></td>
            `;
            mBody.appendChild(tr);

            // AUTO DATE ENGINE HOOK TRIGGERS
            const catSelect = document.getElementById(`plan-cat-${m.username}`);
            const startInput = document.getElementById(`plan-start-${m.username}`);
            const expiryInput = document.getElementById(`plan-expiry-${m.username}`);

            const runAutoDateCalc = () => {
                const calculatedDate = calculateExpiryDate(startInput.value, catSelect.value);
                if (calculatedDate) {
                    expiryInput.value = calculatedDate;
                }
            };

            catSelect.addEventListener('change', runAutoDateCalc);
            startInput.addEventListener('change', runAutoDateCalc);
        });

        // Build staff management structural lines
        const sBody = document.getElementById('admin-staff-table-body');
        sBody.innerHTML = '';
        data.admins.forEach(a => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-zinc-900 hover:bg-zinc-900/20";
            
            const isRoot = ['HIMANSHU', 'sudhanshu'].includes(a.username);
            const deleteBtn = isRoot ? `<span class="text-[9px] text-zinc-600 uppercase font-mono tracking-wider">System Core Root</span>` : 
                `<button onclick="openDoubleCheck('${a.username}', () => deleteAdmin('${a.username}'))" class="bg-red-950 text-red-400 border border-red-900/60 px-2 py-1 rounded-md hover:bg-red-900 hover:text-white transition">Delete</button>`;

            tr.innerHTML = `
                <td class="py-3 font-bold text-white font-mono">${a.username}</td>
                <td>
                    <div class="flex items-center gap-1">
                        <input type="text" value="${a.password}" id="p-admin-override-${a.username}" class="bg-zinc-900 border border-zinc-800 text-white rounded px-2 py-0.5 font-mono text-[10px] w-36 focus:border-yellow-400 focus:outline-none">
                        <button onclick="updateAdminPass('${a.username}')" class="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wide border border-zinc-700">Save</button>
                    </div>
                </td>
                <td><span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${isRoot ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' : 'bg-zinc-800 text-zinc-300'}">${a.role}</span></td>
                <td class="text-right">${deleteBtn}</td>
            `;
            sBody.appendChild(tr);
        });

    } catch (e) { console.error('Error compiled during structural dynamic engine rendering.', e); }
}

// MANAGEMENT OPERATIONS AND MUTATION PAYLOADS
async function adminAddMember(event) {
    event.preventDefault();
    const payload = {
        firstName: document.getElementById('am-first').value.trim(),
        lastName: document.getElementById('am-last').value.trim(),
        dob: document.getElementById('am-dob').value,
        age: document.getElementById('am-age').value,
        gender: document.getElementById('am-gender').value,
        height: document.getElementById('am-height').value,
        weight: document.getElementById('am-weight').value,
        mobileNumber: document.getElementById('am-mobile').value.trim(),
        secretWord: document.getElementById('am-secret').value.trim()
    };

    const response = await fetch(`${BACKEND_URL}/member/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    alert(data.message);
    if(data.success) { event.target.reset(); loadAdminDashboardData(); }
}

async function adminAddAdmin(event) {
    event.preventDefault();
    const payload = {
        username: document.getElementById('aa-user').value.trim(),
        password: document.getElementById('aa-pass').value.trim(),
        role: document.getElementById('aa-role').value
    };

    const response = await fetch(`${BACKEND_URL}/admin/add-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    alert(data.message);
    if(data.success) { event.target.reset(); loadAdminDashboardData(); }
}

async function updateMemberPlanFull(event, username) {
    event.preventDefault();
    const formElements = event.target.querySelectorAll('input, select');
    const overridenPassword = document.getElementById(`p-override-${username}`).value.trim();

    const payload = {
        username: username,
        password: overridenPassword,
        planCategory: formElements[0].value,
        planStart: formElements[1].value,
        planExpiry: formElements[2].value,
        hasPT: formElements[3].value,
        trainerName: formElements[4].value.trim(),
        paymentMode: formElements[5].value
    };

    const response = await fetch(`${BACKEND_URL}/admin/update-member-full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    alert(data.message);
    loadAdminDashboardData();
}

async function updateAdminPass(username) {
    const freshPass = document.getElementById(`p-admin-override-${username}`).value.trim();
    const response = await fetch(`${BACKEND_URL}/admin/update-admin-pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: freshPass })
    });
    const data = await response.json();
    alert(data.message);
    loadAdminDashboardData();
}

async function deleteMember(username) {
    await fetch(`${BACKEND_URL}/admin/member/${username}`, { method: 'DELETE' });
    closeDoubleCheck();
    loadAdminDashboardData();
}

async function deleteAdmin(username) {
    const res = await fetch(`${BACKEND_URL}/admin/manage/${username}`, { method: 'DELETE' });
    const data = await res.json();
    if(!data.success) alert(data.message);
    closeDoubleCheck();
    loadAdminDashboardData();
}

// MODAL WINDOW HOOK IN CONTROLS
function openDoubleCheck(displayName, successCallback) {
    document.getElementById('dc-target-name').innerText = displayName;
    deleteCallback = successCallback;
    document.getElementById('double-check-modal').classList.remove('hidden');
}

function closeDoubleCheck() {
    document.getElementById('double-check-modal').classList.add('hidden');
    deleteCallback = null;
}

document.getElementById('dc-confirm-btn').addEventListener('click', () => {
    if (deleteCallback) deleteCallback();
});