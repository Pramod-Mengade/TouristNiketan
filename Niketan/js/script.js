/**
 * ==========================================
 * 0. SESSION STATE
 * ==========================================
 */
let currentUserEmail = null;

// Check session from localStorage (set by Google Sign-In on index.html)
(function checkUserSession() {
    const sessionData = localStorage.getItem('sessionUser');
    if (sessionData) {
        try {
            const user = JSON.parse(sessionData);
            currentUserEmail = user.email;
            console.log("Logged in as:", currentUserEmail);
        } catch (err) {
            console.error("Failed to parse session:", err);
            window.location.href = 'index.html';
        }
    } else {
        // No session, redirect to login
        window.location.href = 'index.html';
    }
})();

/**
 * ==========================================
 * 1. DOM Elements
 * ==========================================
 */
// --- Chat Elements ---
const chatDisplayArea = document.getElementById('chat-display-area'); 
const chatInputField = document.getElementById('chatbot-input');      
const sendButton = document.getElementById('chatbot-send');           
const welcomeScreen = document.getElementById('chatbot-welcome');
const toggleBtn = document.getElementById('chatbot-toggle');
const container = document.getElementById('chatbot-container');
const closeBtn = document.getElementById('close-chatbot');
const label = document.getElementById('chatbot-label');
const chips = document.querySelectorAll('.suggestion-chip');

let chatOpen = false;


/**
 * ==========================================
 * 3. UI Toggles
 * ==========================================
 */
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        chatOpen = !chatOpen;
        container.classList.toggle('show', chatOpen);
        toggleBtn.classList.toggle('active', chatOpen);
        if (label) label.classList.add('hide');
    });
}

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        chatOpen = false;
        container.classList.remove('show');
        toggleBtn.classList.remove('active');
    });
}

/**
 * ==========================================
 * 4. Helper Functions
 * ==========================================
 */
function appendMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `message-${sender}`);
    
    // Basic inline styling for chat bubbles
    messageElement.style.padding = '10px 14px';
    messageElement.style.borderRadius = '14px';
    messageElement.style.maxWidth = '85%';
    messageElement.style.wordWrap = 'break-word';
    messageElement.style.fontFamily = "'Poppins', sans-serif";
    messageElement.style.fontSize = "13px";
    messageElement.style.lineHeight = "1.5";
    messageElement.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
    
    if (sender === 'user') {
        messageElement.style.alignSelf = 'flex-end';
        messageElement.style.background = 'linear-gradient(135deg, #ff6b00, #e85d00)';
        messageElement.style.color = '#fff';
        messageElement.style.borderBottomRightRadius = '4px';
    } else {
        messageElement.style.alignSelf = 'flex-start';
        messageElement.style.backgroundColor = '#fff';
        messageElement.style.color = '#333';
        messageElement.style.border = '1px solid #eee';
        messageElement.style.borderBottomLeftRadius = '4px';
    }

    messageElement.textContent = text;
    chatDisplayArea.appendChild(messageElement);
    
    // Auto-Scroll to the bottom
    chatDisplayArea.scrollTop = chatDisplayArea.scrollHeight;

    return messageElement;
}

/**
 * ==========================================
 * 5. Main Message Handling & API Integration
 * ==========================================
 */
async function handleSendMessage(queryOverride = null) {
    const userMessage = queryOverride || chatInputField.value.trim();

    if (!userMessage) return;

    // Transition UI to chat mode
    if (welcomeScreen && welcomeScreen.style.display !== 'none') {
        welcomeScreen.style.display = 'none';
        chatDisplayArea.style.display = 'flex';
    }

    // Append user message
    appendMessage(userMessage, 'user');
    chatInputField.value = '';

    // Append a temporary "Thinking..." message
    const thinkingMessageElement = appendMessage('Thinking...', 'bot');
    thinkingMessageElement.style.opacity = '0.6';

    try {
        // API Integration with hardcoded local backend URL
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: userMessage })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Remove the temporary "Thinking..." message
        thinkingMessageElement.remove();

        // Append the bot's actual response
        if (data && data.answer) {
            appendMessage(data.answer, 'bot');
        } else {
            appendMessage("Sorry, I received an invalid response format.", 'bot');
        }

    } catch (error) {
        console.error('Chatbot API Error:', error);
        thinkingMessageElement.remove();
        appendMessage("Unable to connect to the backend. Please check the connection and try again.", 'bot');
    }
}

/**
 * ==========================================
 * 6. Chat Event Listeners
 * ==========================================
 */
if (sendButton) {
    sendButton.addEventListener('click', () => handleSendMessage());
}

if (chatInputField) {
    chatInputField.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSendMessage();
        }
    });
}

// Map suggestion chips to sending messages
if (chips) {
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.getAttribute('data-query');
            handleSendMessage(query);
        });
    });
}