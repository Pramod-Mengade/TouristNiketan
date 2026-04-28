/**
 * ==========================================
 * USER-INFO.JS — Profile Completion Page
 * Reads session from localStorage (set by Google Sign-In on index.html)
 * Saves user info directly to Supabase database
 * ==========================================
 */

// ─── Supabase Setup ───
const SUPABASE_URL = 'https://dargdraljdimmiygkarr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcmdkcmFsamRpbW1peWdrYXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2OTAyMjQsImV4cCI6MjA5MTI2NjIyNH0.I2RMrSmP13COFUqK9T2C9Widh88h8P3z_kzk7uw9zQA';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── DOM References ───
const loadingOverlay = document.getElementById('loading-overlay');
const emailChip = document.getElementById('email-chip');
const emailDisplay = document.getElementById('email-display');
const form = document.getElementById('user-info-form');
const submitBtn = document.getElementById('submit-btn');

// Holds the verified email from the Google login session
let currentUserEmail = null;

// ─── Auth Check (On Load) ───
(function checkAuth() {
    const sessionData = localStorage.getItem('sessionUser');

    if (!sessionData) {
        console.log('No session found, redirecting to login...');
        window.location.href = 'index.html';
        return;
    }

    try {
        const user = JSON.parse(sessionData);
        currentUserEmail = user.email;
        console.log('Logged in as:', currentUserEmail);

        // Show the email chip
        emailDisplay.textContent = currentUserEmail;
        emailChip.style.visibility = 'visible';

    } catch (err) {
        console.error('Failed to parse session:', err);
        window.location.href = 'index.html';
        return;
    }

    // Fade out loading overlay
    loadingOverlay.classList.add('hidden');
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
    }, 400);
})();

// ─── Form Submission Logic ───
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('full-name').value.trim();
    const age = parseInt(document.getElementById('age').value, 10);

    // Basic client-side validation
    if (!name) {
        alert('Please enter your full name.');
        return;
    }
    if (!age || age < 1 || age > 120) {
        alert('Please enter a valid age (1–120).');
        return;
    }
    if (!currentUserEmail) {
        alert('Session expired. Please log in again.');
        window.location.href = 'index.html';
        return;
    }

    // Show loading state on button
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        // ─── Save to Supabase Database ───
        const { data, error } = await supabaseClient
            .from('users')
            .insert([
                {
                    name: name,
                    age: age,
                    email: currentUserEmail
                }
            ]);

        if (error) {
            console.error('Supabase insert error:', error);
            alert('Failed to save your info: ' + error.message);
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }

        console.log('User info saved to Supabase successfully!', data);

        // Also save locally as backup
        localStorage.setItem('userInfo', JSON.stringify({ name, age, email: currentUserEmail }));

        // Also try sending to teammate's backend (non-blocking)
        try {
            fetch('', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, age, email: currentUserEmail }),
            });
        } catch (backendErr) {
            console.warn('Teammate backend unreachable:', backendErr.message);
        }

        // Mark profile as completed and go to main
        localStorage.setItem('userInfoCompleted', 'true');
        window.location.href = 'main.html';

    } catch (err) {
        console.error('Unexpected error:', err);
        alert('Something went wrong. Please try again.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});
