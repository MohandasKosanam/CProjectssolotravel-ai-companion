document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chatBox');
    const chatInput = document.querySelector('.chat-input input');
    const sendBtn = document.querySelector('.chat-input .btn-primary');
    const moodButtons = document.querySelectorAll('.btn-mood');
    const sosBtn = document.querySelector('.safety-box button');
    const headerTitle = document.querySelector('header h2');
    const navLinks = document.querySelectorAll('.main-nav .nav-link');
    const sections = document.querySelectorAll('.main-section');
    const currentLocationLabel = document.querySelector('.current-location-label');
    const liveMapEl = document.getElementById('liveMap');
    const mapHintText = document.querySelector('.map-hint-text');
    const mobileChatBtn = document.querySelector('.mobile-scroll-chat');
    const chatAside = document.getElementById('chatAside');
    const btnLocation = document.getElementById('btnLocation');

    if (!chatBox || !chatInput || !sendBtn) {
        console.warn('Chat UI elements not found.');
        return;
    }

    const state = {
        userName: 'Alex',
        lastMood: 'Adventurous',
        activeSection: 'dashboard',
        coords: null,
        map: null,
        mapMarker: null,
        mapInitialized: false,
        watchingLocation: false,
    };

    function getHeaderLocationLabel() {
        if (state.coords) {
            const {
                lat,
                lng
            } = state.coords;
            return `${lat.toFixed(3)}, ${lng.toFixed(3)} approx`;
        }
        return 'Unknown · enable location';
    }

    function getSentenceLocation() {
        if (state.coords) return 'around you right now';
        return 'around your current area';
    }

    function updateHeaderLocation() {
        if (!currentLocationLabel) return;
        currentLocationLabel.innerHTML =
            `<i class="fa-solid fa-location-dot me-1"></i>${getHeaderLocationLabel()}`;
    }

    function updateGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Good Morning';
        if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
        else if (hour >= 17) greeting = 'Good Evening';
        if (headerTitle) headerTitle.innerText = `${greeting}, ${state.userName}!`;
    }

    updateGreeting();
    updateHeaderLocation();

    addMessage(
        `Hey ${state.userName}, I’m your travel companion. Enable live location and tell me your mood, and I’ll guide you ${getSentenceLocation()}.`,
        'ai'
    );

    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const target = link.dataset.section;
            if (!target) return;

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(sec => {
                if (sec.id === `section-${target}`) {
                    sec.classList.add('active');
                } else {
                    sec.classList.remove('active');
                }
            });

            state.activeSection = target;
        });
    });

    moodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            moodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const mood = (btn.dataset.mood || btn.innerText).trim();
            state.lastMood = mood;
            handleMoodTrigger(mood);
        });
    });

    function handleMoodTrigger(mood) {
        let reply = '';
        const where = getSentenceLocation();

        switch (mood.toLowerCase()) {
            case 'adventurous':
                reply = `You’re in an adventurous mood. I suggest exploring a landmark or viewpoint ${where}. I’ll keep the route safer and not too isolated.`;
                break;
            case 'relaxed':
                reply = `You feel relaxed. Let me find calm spots ${where} like parks or quiet cafés where you can sit, read or just watch people.`;
                break;
            case 'lonely':
                reply = `Feeling lonely is normal on solo trips. I can suggest social but safe places ${where}, like group tours, meetups or friendly cafés.`;
                break;
            case 'hungry':
                reply = `You’re hungry. I can point you to solo-friendly food places ${where} that accept card payments and have decent ratings. Any preference like veg, non-veg or quick snacks?`;
                break;
            default:
                reply = `Got it. I’ll keep your mood in mind when suggesting routes and places ${where}.`;
        }

        addMessage(reply, 'ai');
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        addMessage(text, 'user');
        chatInput.value = '';

        showTypingIndicator();
        const delay = 700 + Math.random() * 800;

        setTimeout(() => {
            removeTypingIndicator();
            const response = generateAIResponse(text);
            addMessage(response, 'ai');
        }, delay);
    }

    function generateAIResponse(rawText) {
        const text = rawText.toLowerCase();

        const asksGreeting = /(hi|hello|hey|namaste)/.test(text);
        const asksFood = /(eat|food|restaurant|hungry|breakfast|lunch|dinner)/.test(text);
        const asksSafety = /(safe|danger|crime|scared|worried|dark)/.test(text);
        const asksLost = /(lost|where am i|direction|route|way|navigate|how to go)/.test(text);
        const asksTranslate = /translate|meaning|how to say/.test(text);
        const asksEvents = /(event|things to do|what to do|places to visit|nearby)/.test(text);
        const saysThanks = /(thank you|thanks|ty|tq)/.test(text);
        const asksWeather = /weather|rain|temperature|hot|cold|umbrella/.test(text);

        const where = getSentenceLocation();

        if (asksGreeting) {
            return `Hi ${state.userName}! I’m here ${where}. You can ask me about safety, food, routes or just talk about how you feel.`;
        }
        if (asksLost) {
            return `Stay calm. I suggest moving towards a brighter, more crowded area ${where}. Stick to main roads, and I’ll keep assuming safer routes for you.`;
        }
        if (asksSafety) {
            return `Keep your phone charged, avoid very empty streets, and trust your instincts. I’ll always lean towards safer, more public suggestions ${where}.`;
        }
        if (asksFood) {
            return `I recommend simple, solo-friendly food options ${where}. Look for places that are moderately busy, not totally empty, and have clear pricing.`;
        }
        if (asksTranslate) {
            return 'Tell me the phrase and I’ll help you translate it and break it into simple sounds you can say.';
        }
        if (asksEvents) {
            return `You can look for small group tours, markets and open spaces ${where}. I’d avoid very isolated events if you feel unsure.`;
        }
        if (asksWeather) {
            return 'I cannot fetch live weather here, but carrying a light jacket, water and a small umbrella is always a smart move.';
        }
        if (saysThanks) {
            return 'Always here for you. If anything feels off, message me, move to a more public area and stay visible.';
        }

        if (state.lastMood && state.lastMood.toLowerCase() === 'lonely') {
            return 'You’re not alone. Even a short walk in a public place or a cozy café can help. I’ll keep guiding you gently.';
        }

        return 'I’m listening. You can share how you feel, or ask about safety, food, directions or simple suggestions for what to do next.';
    }

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', `${sender}-message`, 'mb-3');
        if (sender === 'user') msgDiv.classList.add('text-end');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('msg-content', 'p-3', 'rounded-3', 'd-inline-block');

        if (sender === 'user') {
            contentDiv.classList.add('bg-primary', 'text-white');
        } else {
            contentDiv.classList.add('bg-light');
        }

        const textSpan = document.createElement('span');
        textSpan.textContent = text;

        const timeSpan = document.createElement('small');
        timeSpan.classList.add('d-block', 'mt-1', 'opacity-75');
        const now = new Date();
        timeSpan.textContent = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        contentDiv.appendChild(textSpan);
        contentDiv.appendChild(timeSpan);
        msgDiv.appendChild(contentDiv);
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function showTypingIndicator() {
        removeTypingIndicator();
        const loader = document.createElement('div');
        loader.id = 'typing-indicator';
        loader.className = 'message ai-message mb-3';
        loader.innerHTML = `
            <div class="msg-content p-2 rounded-3 bg-light text-muted">
                <em>typing...</em>
            </div>
        `;
        chatBox.appendChild(loader);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function removeTypingIndicator() {
        const loader = document.getElementById('typing-indicator');
        if (loader) loader.remove();
    }

    if (sosBtn) {
        sosBtn.addEventListener('click', () => {
            const confirmed = confirm(
                'EMERGENCY ALERT:\n\nAre you sure you want to notify local authorities and your emergency contact?'
            );
            if (confirmed) {
                alert(
                    'SOS signal sent. Your location has been shared with your primary emergency contact.\nStay in a well-lit, public place.'
                );
                addMessage(
                    'SOS activated. Stay calm, stay where people can see you. Help is on the way.',
                    'ai'
                );
            }
        });
    }

    if (mobileChatBtn && chatAside) {
        mobileChatBtn.addEventListener('click', () => {
            chatAside.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    }

    if (liveMapEl && typeof L !== 'undefined') {
        initMap();
    }

    function initMap() {
        if (state.mapInitialized) return;
        state.mapInitialized = true;

        const fallback = [20.5937, 78.9629];

        state.map = L.map('liveMap').setView(fallback, 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(state.map);

        state.mapMarker = L.marker(fallback).addTo(state.map);

        const loader = liveMapEl.querySelector('.map-loader');
        if (loader) loader.remove();
    }

    if (btnLocation) {
        btnLocation.addEventListener('click', () => {
            if (!navigator.geolocation) {
                if (mapHintText) {
                    mapHintText.textContent =
                        'Geolocation is not available in this browser. Map will stay generic.';
                }
                return;
            }

            if (!state.mapInitialized && typeof L !== 'undefined') {
                initMap();
            }

            navigator.geolocation.getCurrentPosition(
                pos => {
                    const {
                        latitude,
                        longitude
                    } = pos.coords;
                    const coords = [latitude, longitude];

                    state.coords = {
                        lat: latitude,
                        lng: longitude
                    };
                    state.map.setView(coords, 15);
                    state.mapMarker.setLatLng(coords);
                    updateHeaderLocation();

                    if (mapHintText) {
                        mapHintText.textContent =
                            'Live location enabled. I’ll think of suggestions based on where you actually are.';
                    }

                    if (!state.watchingLocation) {
                        state.watchingLocation = true;
                        navigator.geolocation.watchPosition(
                            watchPos => {
                                const {
                                    latitude,
                                    longitude
                                } = watchPos.coords;
                                const newCoords = [latitude, longitude];
                                state.coords = {
                                    lat: latitude,
                                    lng: longitude
                                };
                                state.mapMarker.setLatLng(newCoords);
                                updateHeaderLocation();
                            },
                            () => {}, {
                                enableHighAccuracy: true
                            }
                        );
                    }
                },
                () => {
                    if (mapHintText) {
                        mapHintText.textContent =
                            'Unable to read your location. You can try again or move to an open area.';
                    }
                }, {
                    enableHighAccuracy: true
                }
            );
        });
    }
});