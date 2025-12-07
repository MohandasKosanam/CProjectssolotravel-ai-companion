"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // --- DOM refs ---
    const appCarouselEl = document.getElementById("appCarousel");
    const headerLocationLabel = document.getElementById("headerLocationLabel");
    const greetingTitle = document.getElementById("greetingTitle");

    const moodButtons = document.querySelectorAll("#moodStrip button");
    const suggestionsList = document.getElementById("suggestionsList");
    const suggestionsMoodLabel = document.getElementById("suggestionsMoodLabel");
    const btnRefreshSuggestions = document.getElementById("btnRefreshSuggestions");

    const chatBox = document.getElementById("chatBox");
    const chatBoxAside = document.getElementById("chatBoxAside");
    const chatInput = document.getElementById("chatInput");
    const btnSend = document.getElementById("btnSend");
    const chatQuickStrip = document.getElementById("chatQuickStrip");

    const btnLocation = document.getElementById("btnLocation");
    const mapHintText = document.getElementById("mapHintText");
    const riskBanner = document.getElementById("riskBanner");
    const btnImSafe = document.getElementById("btnImSafe");
    const btnSOS = document.getElementById("btnSOS");
    const btnFabSOS = document.getElementById("btnFabSOS");
    const btnOpenSOSConfirm = document.getElementById("btnOpenSOSConfirm");

    const safetyStatusChip = document.getElementById("safetyStatusChip");
    const safetyStatusText = document.getElementById("safetyStatusText");
    const safetyStatusTextMain = document.getElementById("safetyStatusTextMain");
    const safetyDot = document.getElementById("safetyDot");
    const safetyDotMini = document.getElementById("safetyDotMini");

    const btnCheckIn15 = document.getElementById("btnCheckIn15");
    const btnCheckIn30 = document.getElementById("btnCheckIn30");
    const btnCancelCheckIn = document.getElementById("btnCancelCheckIn");
    const checkInStatusChip = document.getElementById("checkInStatusChip");
    const checkInCountdown = document.getElementById("checkInCountdown");

    const contactsForm = document.getElementById("contactsForm");
    const contactsContainer = document.getElementById("contactsContainer");
    const btnAddContactRow = document.getElementById("btnAddContactRow");
    const contactsError = document.getElementById("contactsError");
    const contactsSuccess = document.getElementById("contactsSuccess");
    const safetyCirclePills = document.getElementById("safetyCirclePills");

    const navMain = document.getElementById("navMain");
    const bottomNavButtons = document.querySelectorAll(".nav-bottom-btn");

    // --- State ---
    const state = {
        userName: "Alex",
        lastMood: "Adventurous",
        coords: null,
        map: null,
        mapMarker: null,
        mapInitialized: false,
        watchingLocation: false,
        safeZoneCenter: null,
        safeRadiusMeters: 800,
        lastSafetyStatus: "unknown",
        lastRiskAlertAt: null,
        safeCircle: null,
        emergencyContacts: [],
        sosTimerId: null,
        checkInEndsAt: null,
        checkInIntervalId: null,
        suggestionMarkers: [],
        lastIntent: "greeting",
    };

    const appCarousel = appCarouselEl ?
        new bootstrap.Carousel(appCarouselEl, {
            interval: false
        }) :
        null;

    // --- Utilities ---
    function getGreeting() {
        const h = new Date().getHours();
        if (h < 12) return "Good Morning";
        if (h < 17) return "Good Afternoon";
        return "Good Evening";
    }

    function updateGreeting() {
        if (!greetingTitle) return;
        greetingTitle.textContent = `${getGreeting()}, ${state.userName}`;
    }

    function getHeaderLocationLabel() {
        if (!state.coords) return "Off · tap Enable";
        return `${state.coords.lat.toFixed(3)}, ${state.coords.lng.toFixed(3)} approx`;
    }

    function updateHeaderLocation() {
        if (!headerLocationLabel) return;
        headerLocationLabel.textContent = getHeaderLocationLabel();
    }

    function scrollChatToBottom() {
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        if (chatBoxAside) chatBoxAside.scrollTop = chatBoxAside.scrollHeight;
    }

    function createBubble(text, sender = "ai") {
        const outer = document.createElement("div");
        outer.className =
            "d-flex mb-2 " +
            (sender === "user" ? "justify-content-end" : "justify-content-start");

        const bubble = document.createElement("div");
        bubble.className =
            "rounded-3 p-2 small shadow-sm d-inline-flex flex-column " +
            (sender === "user" ? "bg-primary text-white" : "bg-white");
        bubble.innerHTML = text;

        outer.appendChild(bubble);
        return outer;
    }

    function addMessage(text, sender = "ai") {
        const html = text.replace(/\n/g, "<br>");
        const nodeMain = createBubble(html, sender);
        const nodeSide = createBubble(html, sender);

        if (chatBox) chatBox.appendChild(nodeMain);
        if (chatBoxAside) chatBoxAside.appendChild(nodeSide);
        scrollChatToBottom();
    }

    function showTyping() {
        removeTyping();
        const base = document.createElement("div");
        base.id = "typing-indicator-main";
        base.className = "d-flex mb-2";
        base.innerHTML =
            '<div class="rounded-3 p-2 small bg-white text-muted shadow-sm d-inline-flex align-items-center gap-2"><span class="spinner-border spinner-border-sm"></span><span>Typing…</span></div>';

        if (chatBox) chatBox.appendChild(base);

        const side = base.cloneNode(true);
        side.id = "typing-indicator-side";
        if (chatBoxAside) chatBoxAside.appendChild(side);

        scrollChatToBottom();
    }

    function removeTyping() {
        ["typing-indicator-main", "typing-indicator-side"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }

    function deg2rad(deg) {
        return (deg * Math.PI) / 180;
    }

    function distanceMeters(a, b) {
        if (!a || !b) return Infinity;
        const R = 6371000;
        const dLat = deg2rad(b.lat - a.lat);
        const dLng = deg2rad(b.lng - a.lng);
        const lat1 = deg2rad(a.lat);
        const lat2 = deg2rad(b.lat);
        const x =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2) *
            Math.cos(lat1) *
            Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
        return R * c;
    }

    function determineSafetyStatus() {
        if (!state.safeZoneCenter || !state.coords) return "unknown";
        const d = distanceMeters(state.safeZoneCenter, state.coords);
        return d > state.safeRadiusMeters ? "risky" : "safe";
    }

    function updateSafetyUI() {
        const status = state.lastSafetyStatus;

        if (safetyStatusChip) {
            safetyStatusChip.classList.remove(
                "bg-success-subtle",
                "text-success",
                "bg-danger-subtle",
                "text-danger"
            );
        }

        if (status === "safe") {
            if (safetyStatusChip) {
                safetyStatusChip.textContent = "Safe zone";
                safetyStatusChip.classList.add("bg-success-subtle", "text-success");
            }
            if (safetyStatusText)
                safetyStatusText.textContent =
                "You’re within your comfort circle. Keep choosing main roads, bright spots and places with people.";
            if (safetyStatusTextMain)
                safetyStatusTextMain.textContent =
                "Right now you look within a safe radius. Still, your gut feeling outrules any app.";
            if (safetyDot) safetyDot.style.backgroundColor = "#16a34a";
            if (safetyDotMini) safetyDotMini.style.backgroundColor = "#16a34a";
        } else if (status === "risky") {
            if (safetyStatusChip) {
                safetyStatusChip.textContent = "Be cautious";
                safetyStatusChip.classList.add("bg-danger-subtle", "text-danger");
            }
            if (safetyStatusText)
                safetyStatusText.textContent =
                "You’re a bit outside your starting zone. Prefer busier roads, landmarks and avoid shortcuts.";
            if (safetyStatusTextMain)
                safetyStatusTextMain.textContent =
                "You’ve moved beyond your initial safe circle. Try heading towards a bright main road or a familiar spot.";
            if (safetyDot) safetyDot.style.backgroundColor = "#ef4444";
            if (safetyDotMini) safetyDotMini.style.backgroundColor = "#ef4444";
        } else {
            if (safetyStatusChip) {
                safetyStatusChip.textContent = "Unknown";
            }
            if (safetyStatusText)
                safetyStatusText.textContent =
                "Turn on Live Location so I can guess how safe your surroundings feel.";
            if (safetyStatusTextMain)
                safetyStatusTextMain.textContent =
                "Once I know where you are, I’ll draw a soft safety circle and nudge you if you drift far out of it.";
            if (safetyDot) safetyDot.style.backgroundColor = "#9ca3af";
            if (safetyDotMini) safetyDotMini.style.backgroundColor = "#9ca3af";
        }
    }

    function showRiskBanner() {
        if (!riskBanner) return;
        riskBanner.classList.remove("d-none");
    }

    function hideRiskBanner() {
        if (!riskBanner) return;
        riskBanner.classList.add("d-none");
    }

    function startSosCountdown(reason) {
        clearSosCountdown();
        state.sosTimerId = setTimeout(() => {
            triggerSOS(reason);
        }, 5 * 60 * 1000);
    }

    function clearSosCountdown() {
        if (state.sosTimerId) {
            clearTimeout(state.sosTimerId);
            state.sosTimerId = null;
        }
    }

    function getSentenceLocation() {
        return state.coords ? "around you right now" : "around your area";
    }

    // --- Fake backend for suggestions ---
    function fakeNearbySuggestions({
        mood,
        location
    }) {
        const baseLat = location?.lat ?? 20.5937;
        const baseLng = location?.lng ?? 78.9629;
        const offset = (dLat, dLng) => ({
            lat: baseLat + dLat,
            lng: baseLng + dLng,
        });

        const moodLower = (mood || "").toLowerCase();
        const base = [];

        if (moodLower === "adventurous") {
            base.push({
                id: "adv_view_1",
                name: "Skyline Viewpoint",
                desc: "Popular lookout with people around, great for photos.",
                type: "view",
                mood: "Adventurous",
                coords: offset(0.008, -0.006),
            }, {
                id: "adv_walk_1",
                name: "Riverside Walk",
                desc: "Moderately busy river promenade with lights.",
                type: "walk",
                mood: "Adventurous",
                coords: offset(0.004, 0.003),
            }, {
                id: "adv_cafe_1",
                name: "Traveler’s Café",
                desc: "Solo-friendly café, charging points and Wi-Fi.",
                type: "cafe",
                mood: "Adventurous",
                coords: offset(-0.003, 0.002),
            }, {
                id: "adv_market_1",
                name: "Local Market Loop",
                desc: "Short loop through a safe, lively market.",
                type: "market",
                mood: "Adventurous",
                coords: offset(-0.005, -0.004),
            });
        } else if (moodLower === "relaxed") {
            base.push({
                id: "rel_park_1",
                name: "Quiet Green Park",
                desc: "Benches, shade and people jogging nearby.",
                type: "park",
                mood: "Relaxed",
                coords: offset(0.006, 0),
            }, {
                id: "rel_cafe_1",
                name: "Slow Coffee Spot",
                desc: "Soft music, cozy seating and calm vibe.",
                type: "cafe",
                mood: "Relaxed",
                coords: offset(-0.003, 0.002),
            }, {
                id: "rel_library_1",
                name: "Public Library Corner",
                desc: "Quiet, safe public library with seating.",
                type: "library",
                mood: "Relaxed",
                coords: offset(0.003, -0.001),
            });
        } else if (moodLower === "lonely") {
            base.push({
                id: "lon_cafe_1",
                name: "Community Café Tables",
                desc: "Shared tables, friendly staff, easy to people-watch.",
                type: "cafe",
                mood: "Lonely",
                coords: offset(-0.002, 0.004),
            }, {
                id: "lon_meet_1",
                name: "Evening Group Walk",
                desc: "Small, public group walk route, well-lit.",
                type: "group",
                mood: "Lonely",
                coords: offset(0.005, -0.003),
            }, {
                id: "lon_event_1",
                name: "Hostel Game Night",
                desc: "Low-pressure games night in a central hostel.",
                type: "social",
                mood: "Lonely",
                coords: offset(-0.006, -0.002),
            }, {
                id: "lon_park_1",
                name: "Busy Evening Park",
                desc: "Lots of locals around, easy to sit and watch.",
                type: "park",
                mood: "Lonely",
                coords: offset(0.004, 0.002),
            });
        } else if (moodLower === "hungry") {
            base.push({
                id: "hun_cafe_1",
                name: "Solo-Friendly Café",
                desc: "Counter seating, clear menu, card payments.",
                type: "food",
                mood: "Hungry",
                coords: offset(0.004, -0.002),
            }, {
                id: "hun_resto_1",
                name: "Set-Meal Restaurant",
                desc: "Simple set menus, moderate crowd, not pushy.",
                type: "food",
                mood: "Hungry",
                coords: offset(-0.005, 0.003),
            }, {
                id: "hun_street_1",
                name: "Safe Street Food Lane",
                desc: "Well-lit cluster of vendors, locals around.",
                type: "food",
                mood: "Hungry",
                coords: offset(-0.003, -0.004),
            });
        } else {
            base.push({
                id: "gen_cafe_1",
                name: "Chill Café",
                desc: "Wi-Fi, charging, not too loud.",
                type: "cafe",
                mood: "Neutral",
                coords: offset(-0.003, 0.002),
            }, {
                id: "gen_walk_1",
                name: "Main Street Loop",
                desc: "Short safe loop with shops around.",
                type: "walk",
                mood: "Neutral",
                coords: offset(0.003, -0.002),
            });
        }
        return base;
    }

    // --- Chat brain: intents + follow-up chips ---
    function detectIntent(message) {
        const text = (message || "").toLowerCase();

        if (/(lost|where am i|direction|route|way|navigate|how to go)/.test(text))
            return "directions";
        if (/(safe|danger|crime|scared|worried|dark|unsafe)/.test(text))
            return "safety";
        if (/(eat|food|restaurant|hungry|breakfast|lunch|dinner|cafe)/.test(text))
            return "food";
        if (/(lonely|alone|bored|no one|nobody)/.test(text)) return "lonely";
        if (/(panic|panic attack|anxious|anxiety|overwhelmed)/.test(text))
            return "panic";
        if (/(translate|meaning|how to say|language)/.test(text)) return "translate";
        if (/(budget|money|cheap|afford|too expensive)/.test(text)) return "budget";
        if (/(scam|scammers|cheat|cheating)/.test(text)) return "scam";
        if (/(culture|customs|local|dress|respect)/.test(text)) return "culture";
        if (/(thank you|thanks|ty|tq)/.test(text)) return "thanks";
        if (/(hi|hello|hey|namaste)\b/.test(text)) return "greeting";

        return "generic";
    }

    function fakeChatReply({
        message,
        mood,
        location,
        safetyStatus
    }) {
        const where = location ? "around you right now" : "around your area";
        const intent = detectIntent(message);
        state.lastIntent = intent;

        switch (intent) {
            case "greeting":
                return {
                    text:
                        `Hey ${state.userName}. I’m here ${where}.\n` +
                        `You can talk about feelings, ask if an area feels safe, or say “I’m lost” and I’ll give a calm plan.`,
                        chips: ["Is this area safe?", "Find food nearby", "I feel lonely"],
                };
            case "directions":
                return {
                    text:
                        "Okay, directions first. 🌍\n\n" +
                        "1. Move towards a brighter, more crowded street.\n" +
                        "2. Look for a big landmark (station, mall, main road) instead of tiny lanes.\n" +
                        "3. If you feel unsafe, step into a café, store or hotel lobby and re-check your route.\n\n" +
                        "You can tell me: “Which type of places should I walk towards?”",
                        chips: ["I feel unsafe", "Find a café nearby", "I reached the main road"],
                };
            case "safety":
                return {
                    text:
                        "Your safety > everything else. 🛡️\n\n" +
                        "• Stick to main, well-lit streets with people.\n" +
                        "• Avoid totally empty shortcuts, alleys or parks late at night.\n" +
                        "• Keep one ear free if you’re using headphones.\n" +
                        "• If someone feels pushy, you owe them nothing — walk away towards a busier place.\n\n" +
                        "If you want, you can also start a 15-minute check-in timer in the Safety tab.",
                        chips: ["Start 15 min check-in", "What if someone follows me?", "Is this neighbourhood ok?"],
                };
            case "food":
                return {
                    text:
                        "Hunting for food, love it. 🍽️\n\n" +
                        `Look for:\n` +
                        "• Places with a moderate crowd (not totally empty, not chaos).\n" +
                        "• Menus with clear prices.\n" +
                        "• Staff who aren’t aggressively pulling you in.\n\n" +
                        "I’d lean towards cafés and simple local spots over loud bars when you’re solo.",
                        chips: ["Find café-like places", "I want cheap food", "Is street food safe?"],
                };
            case "lonely":
                return {
                    text:
                        "Feeling lonely on a solo trip is incredibly normal. 💛\n\n" +
                        "You’re not weird for it.\n\n" +
                        "Options that help:\n" +
                        "• Sit in a café or busy park and just people-watch.\n" +
                        "• Join a small group activity (walk, hostel event, workshop).\n" +
                        "• Call or text someone from your safety circle just to share how the day went.\n\n" +
                        "You don’t have to be ‘social’ to feel less alone — being around people is already something.",
                        chips: ["Find social but safe places", "I want quiet instead", "Help me calm down"],
                };
            case "panic":
                return {
                    text:
                        "Okay, breathing first. 🧘‍♀️\n\n" +
                        "Try this right now:\n" +
                        "• Inhale for 4 seconds\n" +
                        "• Hold for 4 seconds\n" +
                        "• Exhale for 6 seconds\n\n" +
                        "Repeat that a few times while standing somewhere you feel at least a bit safe (a shop, café doorway, lobby).\n\n" +
                        "You can tell me where you are roughly, and I’ll suggest calmer next steps.",
                        chips: ["I’m outside on the street", "I’m in a café now", "Start a check-in timer"],
                };
            case "translate":
                return {
                    text:
                        "I can help with translations conceptually. 🌐\n\n" +
                        "Just say something like:\n" +
                        "• “Translate ‘Where is the bus stop?’ to Spanish.”\n" +
                        "• “How do I say ‘I’m vegetarian’ in French?”\n\n" +
                        "I’ll keep the phrases short and practical.",
                        chips: ["Translate: Where is the metro?", "Translate: I’m vegetarian", "Translate: Is this spicy?"],
                };
            case "budget":
                return {
                    text:
                        "Let’s keep your wallet happy. 💸\n\n" +
                        "General rules:\n" +
                        "• Eat 1–2 meals in simple local spots, 1 in a café.\n" +
                        "• Check approximate prices online or on the menu before committing.\n" +
                        "• Avoid places that refuse to show prices or feel super pushy.\n\n" +
                        "You can also ask me about strategies like daily caps or must-spend vs nice-to-have.",
                        chips: ["I want cheap dinner", "How to avoid tourist traps?", "What is a good daily budget?"],
                };
            case "scam":
                return {
                    text:
                        "Good that you’re thinking about this. 🚫\n\n" +
                        "Typical scams to be wary of:\n" +
                        "• ‘Too helpful’ strangers insisting on guiding you somewhere.\n" +
                        "• Taxis refusing meters and quoting vague prices.\n" +
                        "• Shops with no visible prices.\n\n" +
                        "When in doubt, walk away towards a busier, more official-looking place.",
                        chips: ["How to say no politely?", "What if they won’t leave?", "Should I call someone?"],
                };
            case "culture":
                return {
                    text:
                        "Respecting local culture is a power move. 🌏\n\n" +
                        "Some general tips:\n" +
                        "• Dress a bit more modestly near temples or religious sites.\n" +
                        "• Watch how locals behave (shoes off, quiet tone, etc.) and mirror that.\n" +
                        "• When unsure, asking politely is always okay.\n\n" +
                        "You can also ask about a specific place or situation.",
                        chips: ["Temple etiquette?", "How should I dress?", "Is tipping expected?"],
                };
            case "thanks":
                return {
                    text:
                        "Always here for you. 🤝\n\n" +
                        "If something feels off, you’re allowed to leave, change plans or go back early. That’s not ‘wasting’ a trip — that’s respecting yourself.",
                        chips: ["I still feel uneasy", "Help me plan tomorrow", "Find a calm place nearby"],
                };
            case "generic":
            default:
                return {
                    text:
                        "I’m listening. 🧡\n\n" +
                        "You can:\n" +
                        "• Dump your feelings — anxious, excited, confused.\n" +
                        "• Ask: “Is this area safe?”\n" +
                        "• Say: “I’m lost, what should I do?”\n" +
                        "• Ask for food, directions, or help deciding what to do next.\n\n" +
                        "Nothing is too small to talk about.",
                        chips: ["Is this area safe?", "I feel anxious", "Find food nearby"],
                };
        }
    }

    function renderQuickChips(chips) {
        if (!chatQuickStrip) return;
        chatQuickStrip.innerHTML = "";
        (chips || []).forEach((label) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className =
                "btn btn-sm btn-outline-secondary rounded-pill px-2 d-inline-flex align-items-center gap-1";
            btn.textContent = label;
            btn.addEventListener("click", () => {
                if (chatInput) chatInput.value = label;
                sendMessage();
                if (appCarousel) appCarousel.to(4);
            });
            chatQuickStrip.appendChild(btn);
        });
    }

    function sendToChatBrain(text) {
        const replyObj = fakeChatReply({
            message: text,
            mood: state.lastMood,
            location: state.coords,
            safetyStatus: state.lastSafetyStatus,
        });
        addMessage(replyObj.text, "ai");
        renderQuickChips(replyObj.chips);
    }

    // --- Suggestions + Map pins ---
    function clearSuggestionMarkers() {
        if (!state.map || !state.suggestionMarkers) return;
        state.suggestionMarkers.forEach((m) => m.remove());
        state.suggestionMarkers = [];
    }

    function renderSuggestions() {
        if (!suggestionsList) return;

        suggestionsList.innerHTML = "";

        if (!state.coords) {
            suggestionsList.innerHTML =
                '<div class="border border-dashed rounded-3 p-3 d-flex flex-column align-items-center justify-content-center text-muted text-center">' +
                '<i class="fa-solid fa-location-crosshairs mb-1"></i>' +
                "<span>Enable location to see mood-aware nearby spots.</span></div>";
            return;
        }

        const items = fakeNearbySuggestions({
            mood: state.lastMood,
            location: state.coords,
        });

        if (!items.length) {
            suggestionsList.innerHTML =
                '<div class="border rounded-3 p-2 text-muted small">No suggestions yet. Try changing your mood.</div>';
            return;
        }

        if (suggestionsMoodLabel) {
            suggestionsMoodLabel.textContent = `Mood: ${state.lastMood}`;
        }

        clearSuggestionMarkers();

        const iconMap = {
            cafe: "fa-mug-hot",
            park: "fa-tree",
            walk: "fa-person-walking",
            view: "fa-mountain",
            market: "fa-store",
            food: "fa-utensils",
            library: "fa-book",
            social: "fa-people-group",
            group: "fa-people-group",
        };

        items.forEach((item, index) => {
            const icon = iconMap[item.type] || "fa-location-dot";

            const card = document.createElement("button");
            card.type = "button";
            card.className =
                "w-100 text-start border rounded-3 p-2 d-flex flex-column gap-1 bg-white hover-shadow-sm";

            card.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-2">
            <span class="rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center"
                  style="width:28px;height:28px;">
              <i class="fa-solid ${icon}"></i>
            </span>
            <span class="fw-semibold small">${item.name}</span>
          </div>
          <span class="badge bg-secondary-subtle text-secondary rounded-pill small text-capitalize">
            ${item.type}
          </span>
        </div>
        <div class="text-muted small">
          ${item.desc}
        </div>
        <div class="d-flex justify-content-between align-items-center small text-muted">
          <span>For: ${item.mood}</span>
          <span class="d-flex align-items-center gap-1 text-primary">
            <i class="fa-solid fa-location-arrow"></i>
            <span>Focus on map</span>
          </span>
        </div>
      `;

            if (state.map && typeof L !== "undefined") {
                const marker = L.marker([item.coords.lat, item.coords.lng]).addTo(
                    state.map
                );
                marker.bindPopup(`<strong>${item.name}</strong><br>${item.desc}`);
                state.suggestionMarkers.push(marker);

                card.addEventListener("click", () => {
                    state.map.setView([item.coords.lat, item.coords.lng], 16);
                    marker.openPopup();
                    if (appCarousel) appCarousel.to(0);
                });

                if (index === 0) {
                    state.map.setView([item.coords.lat, item.coords.lng], 15);
                }
            }

            suggestionsList.appendChild(card);
        });
    }

    // --- SOS + Contacts ---
    function readContactsFromForm() {
        if (!contactsContainer) return [];
        const rows = contactsContainer.querySelectorAll(".contact-row");
        const contacts = [];
        rows.forEach((row) => {
            const name = row.querySelector(".contact-name")?.value.trim();
            const phone = row.querySelector(".contact-phone")?.value.trim();
            const relation = row.querySelector(".contact-relation")?.value.trim();
            if (name && phone) contacts.push({
                name,
                phone,
                relation
            });
        });
        return contacts;
    }

    function saveContactsToStorage(contacts) {
        try {
            localStorage.setItem("soloTravelContacts", JSON.stringify(contacts));
        } catch (err) {
            console.warn("Could not save contacts", err);
        }
    }

    function loadContactsFromStorage() {
        try {
            const raw = localStorage.getItem("soloTravelContacts");
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.warn("Could not load contacts", err);
            return [];
        }
    }

    function updateSOSAvailability() {
        const enabled = state.emergencyContacts.length >= 3;
        if (btnSOS) btnSOS.disabled = !enabled;
        if (btnFabSOS) btnFabSOS.disabled = !enabled;
    }

    function renderSafetyCirclePills() {
        if (!safetyCirclePills) return;
        safetyCirclePills.innerHTML = "";
        if (!state.emergencyContacts.length) {
            safetyCirclePills.innerHTML =
                '<span class="badge bg-secondary-subtle text-secondary rounded-pill small">Add contacts to build your circle.</span>';
            return;
        }
        state.emergencyContacts.slice(0, 4).forEach((c) => {
            const pill = document.createElement("span");
            pill.className =
                "badge bg-secondary-subtle text-secondary rounded-pill small";
            pill.textContent = c.relation ? `${c.name} (${c.relation})` : c.name;
            safetyCirclePills.appendChild(pill);
        });
        if (state.emergencyContacts.length > 4) {
            const extra = document.createElement("span");
            extra.className = "small text-muted ms-1";
            extra.textContent = `+${state.emergencyContacts.length - 4} more`;
            safetyCirclePills.appendChild(extra);
        }
    }

    function fakeSendSOS({
        reason,
        mood,
        location
    }) {
        console.log("SOS TRIGGERED (simulation)", {
            reason,
            mood,
            location
        });
    }

    function triggerSOS(reason) {
        hideRiskBanner();
        clearSosCountdown();
        stopCheckIn(false);

        if (state.emergencyContacts.length < 3) {
            alert("SOS is locked. Add at least 3 emergency contacts first.");
            return;
        }

        addMessage(
            "SOS triggered (simulated). In a real app, your live location would now be shared with your safety circle and emergency services.",
            "ai"
        );
        fakeSendSOS({
            reason,
            mood: state.lastMood,
            location: state.coords,
        });
        alert(
            "SOS dispatched (simulation). Head towards a bright, public place and stay near people."
        );
    }

    // --- Check-in timers ---
    function startCheckIn(minutes) {
        const durationMs = minutes * 60 * 1000;
        state.checkInEndsAt = Date.now() + durationMs;
        if (checkInStatusChip) {
            checkInStatusChip.innerHTML =
                '<i class="fa-solid fa-clock"></i> Check-in active';
        }

        if (state.checkInIntervalId) clearInterval(state.checkInIntervalId);
        state.checkInIntervalId = setInterval(updateCheckInUI, 1000);

        addMessage(
            `Got it. I’ve started a ${minutes}-minute check-in timer. If you don’t respond by then, I’ll treat it as a safety signal (simulated).`,
            "ai"
        );
        updateCheckInUI();
    }

    function stopCheckIn(userCancelled) {
        state.checkInEndsAt = null;
        if (state.checkInIntervalId) {
            clearInterval(state.checkInIntervalId);
            state.checkInIntervalId = null;
        }
        if (checkInStatusChip)
            checkInStatusChip.innerHTML =
            '<i class="fa-solid fa-clock"></i> No check-in';
        if (checkInCountdown) checkInCountdown.textContent = "No active check-in.";
        if (userCancelled) {
            addMessage(
                "Check-in cancelled. You can start another whenever you want a safety net.",
                "ai"
            );
        }
    }

    function updateCheckInUI() {
        if (!checkInCountdown) return;
        if (!state.checkInEndsAt) {
            checkInCountdown.textContent = "No active check-in.";
            return;
        }

        const msLeft = state.checkInEndsAt - Date.now();
        if (msLeft <= 0) {
            state.checkInEndsAt = null;
            if (state.checkInIntervalId) {
                clearInterval(state.checkInIntervalId);
                state.checkInIntervalId = null;
            }
            if (checkInStatusChip)
                checkInStatusChip.innerHTML =
                '<i class="fa-solid fa-circle-exclamation"></i> Missed check-in';
            checkInCountdown.textContent =
                "Check-in time passed. I’ll treat this like a possible safety issue.";

            addMessage(
                "Your check-in time just passed. If this were live, I’d send an alert with your last known location to your safety circle.",
                "ai"
            );
            triggerSOS("missed-checkin");
            return;
        }

        const totalSec = Math.floor(msLeft / 1000);
        const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
        const s = String(totalSec % 60).padStart(2, "0");
        checkInCountdown.textContent = `Time left: ${m}:${s}`;
    }

    // --- Map + location ---
    function initMap() {
        if (state.mapInitialized || typeof L === "undefined") return;
        state.mapInitialized = true;

        const fallback = [20.5937, 78.9629];

        state.map = L.map("liveMap").setView(fallback, 4);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(state.map);

        state.mapMarker = L.marker(fallback).addTo(state.map);

        state.safeCircle = L.circle(fallback, {
            radius: state.safeRadiusMeters,
            color: "#22c55e",
            fillColor: "#bbf7d0",
            fillOpacity: 0.2,
        }).addTo(state.map);

        const loader = document.getElementById("mapLoader");
        if (loader) loader.remove();
    }

    function handleLocationUpdate(coords, initial = false) {
        const {
            latitude,
            longitude
        } = coords;
        state.coords = {
            lat: latitude,
            lng: longitude
        };

        if (state.map && state.mapMarker) {
            const point = [latitude, longitude];
            state.mapMarker.setLatLng(point);
            state.map.setView(point, initial ? 15 : state.map.getZoom());

            if (!state.safeZoneCenter) {
                state.safeZoneCenter = {
                    lat: latitude,
                    lng: longitude
                };
            }
            if (state.safeCircle) {
                state.safeCircle.setLatLng(state.safeZoneCenter);
                state.safeCircle.setRadius(state.safeRadiusMeters);
            }
        }

        updateHeaderLocation();
        if (mapHintText) {
            mapHintText.innerHTML =
                '<span>Live location is on. I’ll now pin mood-aware spots around you.</span>' +
                '<span class="text-primary d-flex align-items-center gap-1"><i class="fa-solid fa-route"></i><span>I’ll avoid isolated shortcuts.</span></span>';
        }

        const status = determineSafetyStatus();
        state.lastSafetyStatus = status;
        updateSafetyUI();

        renderSuggestions();

        if (status === "risky") {
            const now = Date.now();
            if (!state.lastRiskAlertAt || now - state.lastRiskAlertAt > 60000) {
                state.lastRiskAlertAt = now;
                showRiskBanner();
                addMessage(
                    "You seem outside your safer circle. Stick to brighter streets with more people, and avoid cutting through empty areas.",
                    "ai"
                );
                startSosCountdown("no-response-risky-route");
            }
        } else {
            hideRiskBanner();
            clearSosCountdown();
        }
    }

    // --- Chat send ---
    function sendMessage() {
        const text = chatInput ? chatInput.value.trim() : "";
        if (!text) return;
        addMessage(text, "user");
        if (chatInput) chatInput.value = "";

        showTyping();
        const delay = 500 + Math.random() * 700;
        setTimeout(() => {
            removeTyping();
            sendToChatBrain(text);
        }, delay);
    }

    // --- Event wiring ---

    // Greeting + first message
    updateGreeting();
    updateHeaderLocation();

    addMessage(
        `Hey ${state.userName}, I’m your travel companion.\n\nTurn on Live Location and tell me how you feel — I’ll quietly blend mood, safety and nearby places ${getSentenceLocation()}.`,
        "ai"
    );
    renderQuickChips(["I feel lonely", "Is this area safe?", "Find food nearby"]);

    // Mood buttons
    moodButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            moodButtons.forEach((b) => {
                b.classList.remove("btn-dark", "active");
                b.classList.add("btn-outline-secondary");
            });
            btn.classList.remove("btn-outline-secondary");
            btn.classList.add("btn-dark", "active");

            const mood = btn.dataset.mood || btn.textContent.trim();
            state.lastMood = mood;
            if (suggestionsMoodLabel) {
                suggestionsMoodLabel.textContent = `Mood: ${mood}`;
            }

            const where = getSentenceLocation();
            let msg = "";
            switch (mood.toLowerCase()) {
                case "adventurous":
                    msg = `You’re in an adventurous mood. I’ll suggest viewpoints and routes ${where}, but still avoid sketchy shortcuts.`;
                    break;
                case "relaxed":
                    msg = `You feel relaxed. I’ll lean towards calm parks, cafés and quiet corners ${where}.`;
                    break;
                case "lonely":
                    msg = `Feeling lonely on a solo trip is very normal. I’ll look for social but safe places ${where}.`;
                    break;
                case "hungry":
                    msg = `You’re hungry. I’ll highlight solo-friendly food places ${where} with straightforward menus.`;
                    break;
                default:
                    msg = `Got it. I’ll keep that in mind for what I suggest ${where}.`;
            }
            addMessage(msg, "ai");
            renderQuickChips(["Find spots for this mood", "Is it safe here?", "I feel anxious"]);
            renderSuggestions();
        });
    });

    // Chat send
    if (btnSend && chatInput) {
        btnSend.addEventListener("click", sendMessage);
        chatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Location button
    if (btnLocation) {
        btnLocation.addEventListener("click", () => {
            if (!navigator.geolocation) {
                if (mapHintText) {
                    mapHintText.textContent =
                        "Geolocation not available in this browser. Map will stay generic.";
                }
                return;
            }

            if (!state.mapInitialized && typeof L !== "undefined") {
                initMap();
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    handleLocationUpdate(pos.coords, true);

                    if (!state.watchingLocation) {
                        state.watchingLocation = true;
                        navigator.geolocation.watchPosition(
                            (watchPos) => handleLocationUpdate(watchPos.coords, false),
                            () => {}, {
                                enableHighAccuracy: true
                            }
                        );
                    }
                },
                () => {
                    if (mapHintText) {
                        mapHintText.textContent =
                            "Unable to read your location. Try again or move to a more open area.";
                    }
                }, {
                    enableHighAccuracy: true
                }
            );
        });
    }

    // Init generic map
    if (document.getElementById("liveMap") && typeof L !== "undefined") {
        initMap();
    }

    // Risk banner button
    if (btnImSafe) {
        btnImSafe.addEventListener("click", () => {
            hideRiskBanner();
            clearSosCountdown();
            addMessage(
                "Okay, I’m glad you feel safe. I’ll keep quietly watching your route in the background (simulation).",
                "ai"
            );
        });
    }

    // SOS buttons
    function confirmAndTriggerSOS() {
        const ok = confirm(
            "Emergency alert.\n\nAre you sure you want to notify your safety circle with your location? (Simulation)"
        );
        if (ok) triggerSOS("manual-sos");
    }
    if (btnSOS) btnSOS.addEventListener("click", confirmAndTriggerSOS);
    if (btnFabSOS) btnFabSOS.addEventListener("click", confirmAndTriggerSOS);
    if (btnOpenSOSConfirm)
        btnOpenSOSConfirm.addEventListener("click", confirmAndTriggerSOS);

    // Check-in
    if (btnCheckIn15) btnCheckIn15.addEventListener("click", () => startCheckIn(15));
    if (btnCheckIn30) btnCheckIn30.addEventListener("click", () => startCheckIn(30));
    if (btnCancelCheckIn)
        btnCancelCheckIn.addEventListener("click", () => stopCheckIn(true));

    // Suggestions refresh button
    if (btnRefreshSuggestions) {
        btnRefreshSuggestions.addEventListener("click", () => {
            renderSuggestions();
            addMessage(
                "Refreshing suggestions around you based on your current mood and location.",
                "ai"
            );
        });
    }

    // Contacts
    function showContactsError(msg) {
        if (!contactsError) return;
        contactsError.textContent = msg;
        contactsError.classList.remove("d-none");
        if (contactsSuccess) contactsSuccess.classList.add("d-none");
    }

    function showContactsSuccess(msg) {
        if (!contactsSuccess) return;
        contactsSuccess.textContent = msg;
        contactsSuccess.classList.remove("d-none");
        if (contactsError) contactsError.classList.add("d-none");
    }

    if (btnAddContactRow && contactsContainer) {
        btnAddContactRow.addEventListener("click", () => {
            const row = document.createElement("div");
            row.className = "row g-2 contact-row";
            row.innerHTML = `
        <div class="col-5">
          <input type="text" class="form-control form-control-sm contact-name" placeholder="Name" />
        </div>
        <div class="col-5">
          <input type="tel" class="form-control form-control-sm contact-phone" placeholder="Phone" />
        </div>
        <div class="col-2">
          <input type="text" class="form-control form-control-sm contact-relation" placeholder="Rel." />
        </div>
      `;
            contactsContainer.appendChild(row);
        });
    }

    if (contactsForm) {
        contactsForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const contacts = readContactsFromForm();
            if (contacts.length < 3) {
                showContactsError("Please add at least 3 contacts with name and phone.");
                return;
            }
            state.emergencyContacts = contacts;
            saveContactsToStorage(contacts);
            updateSOSAvailability();
            renderSafetyCirclePills();
            showContactsSuccess("Contacts saved. SOS and safety circle are now active.");

            setTimeout(() => {
                const modalEl = document.getElementById("contactsModal");
                if (!modalEl) return;
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }, 1000);
        });
    }

    // Preload contacts
    (function preloadContacts() {
        const stored = loadContactsFromStorage();
        if (stored.length) {
            state.emergencyContacts = stored;
            updateSOSAvailability();
            renderSafetyCirclePills();
        } else {
            renderSafetyCirclePills();
        }
    })();

    // Navigation syncing (sidebar + bottom nav)
    if (appCarouselEl) {
        appCarouselEl.addEventListener("slid.bs.carousel", (event) => {
            const index = event.to;

            if (navMain) {
                const buttons = navMain.querySelectorAll(".nav-link");
                buttons.forEach((btn, i) => {
                    btn.classList.toggle("active", i === index);
                });
            }

            bottomNavButtons.forEach((btn) => {
                const slideTo = Number(btn.getAttribute("data-bs-slide-to"));
                btn.classList.toggle("active", slideTo === index);
            });
        });
    }

    bottomNavButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            bottomNavButtons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });
});