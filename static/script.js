let dictionary = null;
let dictionaryReady = false;
var last_input
var focus_input

fetch('./data/en_US.aff').then(response => response.text()).then((affData) => {
    fetch('./data/en_US.dic').then(response => response.text()).then((dicData) => {
        dictionary = new Typo("en_US", affData, dicData);
        console.log("Dictionary Loaded");
        dictionaryReady = true;
    });
});

document.getElementById('policy-link').addEventListener('click', function(e){
    e.preventDefault();
    document.getElementById('policy-modal').style.display = 'flex';
});

document.getElementById('close-policy').addEventListener('click', function(){
    document.getElementById('policy-modal').style.display = 'none';
});

function hideLoadingPage() {
    const loadingContainer = document.querySelector(".loading-container");
    loadingContainer.style.display = "none";
}

function updatePlayerCount(count) {
    const counts = document.querySelector(".counts");
    counts.textContent = count;
}

document.addEventListener("DOMContentLoaded", () => {
    createClockElement();

    const cookieNotification = document.getElementById("cookie-notification");
    const acceptButton = document.getElementById("accept-cookies");

    // Check if user has already accepted cookies
    if (!localStorage.getItem("cookiesAccepted")) {
        cookieNotification.style.display = "block";
    } else {
        hideLoadingPage();
        initializeAppLogic(); // If cookies were already accepted, run the initialization logic.
    }

    acceptButton.addEventListener("click", () => {
        // Hide the notification and save the user's choice
        cookieNotification.style.display = "none";
        localStorage.setItem("cookiesAccepted", "true");
        
        initializeAppLogic();
    });
    if (document.readyState === "complete" && dictionaryReady) {
        hideLoadingPage();
    }
});

function initializeAppLogic() {
    initializeApp().then(app => {
        // Use app to get the session ID and refresh content
        createSubmitButton(app); // Pass app to createSubmitButton

        app.initializeSession().then(() => {
            app.initializeWebSocket();

            // Check the client's status after initializing the session
            fetch("./client/status", {
                method: "GET",
                credentials: 'include', // to ensure cookies are sent with the request
            })
            .then(response => response.json())
            .then(data => {
                if (data.won === 1) {
                    app.fetchAndDisplayContents(false);
                } else {
                    app.fetchAndDisplayContents(true);
                }
            })
            .catch(error => {
                console.error("Error checking client status:", error);
            });
        })
        .catch(err => console.error("Error initializing session:", err));
    });
    hideLoadingPage();
}

function clearPrompt() {
    const promptContainer = document.getElementById("prompt-container");
    while (promptContainer.firstChild) {
        promptContainer.firstChild.remove();
    }
}

function initializeApp() {
    let sessionId;

    async function initializeSession() {
        try {
            const response = await fetch("./client/status", {
                method: "GET",
                credentials: 'include',
            });
            
            const data = await response.json();
    
            if (data.needInitialization) {
                const initResponse = await fetch("./init", {
                    method: "GET",
                    credentials: 'include',
                });
                const initData = await initResponse.json();
                console.log("Session initialized:", initData.session_id);
            } else {
                console.log("Existing session detected.");
            }
    
        } catch (err) {
            console.error("Error initializing session:", err);
        }
    }
    
    function initializeWebSocket() {
        const ws = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + "/clock");

        ws.addEventListener("message", event => {
            const data = JSON.parse(event.data);
            updateClock(data.time);
            updatePlayerCount(data.conns);

            if (data.reset) {
                clearPrompt();
                fetchAndDisplayContents(true);
            }
        });
    }

    async function fetchAndDisplayContents(prompt) {
        try {
            const response = await fetch('./fetch/contents', {
                method: "GET",
                credentials: 'include'
            });
            const data = await response.json();
            displayStory(data.story);
            displayImage(data.image);
            if (prompt === true) {
                displayPrompt(data.prompt);
            } else {
                displayPrompt({
                    tokens: [
                        'Congratulations, you got it in',
                        `${data.prompt.attempts} `,
                        (data.prompt.attempts > 1) ? 'attempts!': 'attempt!', 
                        'Good luck next round.'
                    ],
                    masks: [],
                    correct: [1],
                    tries: data.prompt.tries, 
                    attempts: data.prompt.attempts
                });
            }
        } catch (err) {
            console.error("Error fetching contents:", err);
        }
    }

    function getSessionId() {
        return sessionId;
    }

    return Promise.resolve({
        initializeSession,
        initializeWebSocket,
        fetchAndDisplayContents,
        getSessionId
    });
}

function updateClock(time) {
    const clockElement = document.getElementById('clock');
    clockElement.textContent = time;
    const [minutes, seconds] = time.split(":").map(Number);

    if (minutes === 0 && seconds < 60) {
        clockElement.classList.add('blink-red');
    } else {
        clockElement.classList.remove('blink-red');
    }
}


function displayImage(imageData) {
    const imageElement = document.getElementById("generated-image");
    imageElement.src = `data:image/jpeg;base64,${imageData}`;
}

function displayStory(storyData) {
    const storyElement = document.getElementById("story-title");
    storyElement.textContent = `${storyData.title}\n${storyData.episode}/20`;
}

function createClockElement() {
    // Get the app container
    const appContainer = document.getElementById('app');

    // Create the clock div
    const clockDiv = document.createElement('div');
    clockDiv.id = 'clock';
    clockDiv.textContent = '15:00';

    // Append the clock div to the app container
    appContainer.appendChild(clockDiv);

    // Add CSS styles dynamically
    clockDiv.style.fontFamily = 'Orbitron, sans-serif';
    clockDiv.style.position = 'fixed';
    clockDiv.style.top = '70px';
    clockDiv.style.left = '50%';
    clockDiv.style.transform = 'translateX(-50%)';
    clockDiv.style.fontSize = '2em';
    clockDiv.style.textAlign = 'center';
    clockDiv.style.color = 'wheat';
    clockDiv.style.textShadow = '2px 2px 4px rgba(10, 10, 10, 0.9)';
    // clockDiv.style.backgroundColor = 'transparent'; //'rgba(255, 255, 255, 0.4)';
    // clockDiv.style.padding = '10px 20px';
    // clockDiv.style.borderRadius = '15px';
    // clockDiv.style.boxShadow = '0px 0px 15px 5px rgba(255, 255, 255, 0.5)';
}

function createSubmitButton(app) {
    // Get the prompt container
    //const promptContainer = document.getElementById('prompt-container');

    const appContainer = document.getElementById('app');

    // Create the submit button
    const submitButton = document.createElement('button');
    submitButton.id = 'submit-button';
    submitButton.textContent = 'Submit';

    // Append the submit button to the document body (or to a specific container if needed)
    document.body.appendChild(submitButton);

    submitButton.style.position = 'fixed'; // This makes the button stick to the bottom
    submitButton.style.bottom = '10px';    // 10px from the bottom of the page
    submitButton.style.left = '50%';       // Center the button
    submitButton.style.transform = 'translateX(-50%)'; // Ensure it's centered
    submitButton.style.fontSize = '18px';
    submitButton.style.padding = '4px';
    submitButton.style.paddingLeft = '25px';
    submitButton.style.marginBottom = '10px';
    submitButton.style.paddingRight = '25px';
    submitButton.style.backgroundColor = 'transparent';
    submitButton.style.color = "white";
    submitButton.style.border = '2px solid white';
    submitButton.style.borderRadius = '18px';
    submitButton.style.cursor = 'pointer';
    submitButton.style.fontFamily = "Tahoma, sans-serif";
    submitButton.style.textShadow = "2px 2px 3px rgba(0, 0, 0, 0.7)";

    // Add hover effect
    submitButton.onmouseover = function() {
        this.style.backgroundColor = "rgba(180, 180, 180, 0.7)";
    };

    submitButton.onmouseout = function() {
        this.style.backgroundColor = "transparent";
    };

    // Add click event listener
    submitButton.addEventListener('click', () => submitInputs(app));
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitButton.click();
        }
    });

    appContainer.appendChild(submitButton);
}

function getScoreColor(score) {
    const red = Math.floor((1 - score) * 255);
    const green = Math.floor(score * 255);
    return `rgb(${red}, ${green}, 0)`;
}

function displayPrompt(promptData) {
    const { tokens, masks, correct, attempts, tries } = promptData;
    const promptContainer = document.getElementById("prompt-container");
    const triesContainer = document.getElementById("tries-container");
    const attemptsContainer = document.getElementById("attempts-container");
    promptContainer.style.paddingBottom = '40px';
    
    attemptsContainer.textContent = "Attempts: " + attempts;  

    // // Clear any existing tries content
    while (triesContainer.firstChild) {
        triesContainer.firstChild.remove();
    }
    
    for (const [key, value] of Object.entries(tries)) {
        var score = parseFloat(value);
        const div = document.createElement("div");
        rounded_score = `${(score * 100).toFixed(2)}`
        if (rounded_score.length == 4) {
            rounded_score = "0" + rounded_score
        }
        div.textContent = "Score: " + rounded_score + ": " + key
        div.className = "try-container"
        triesContainer.appendChild(div)
    }
    triesContainer.scrollTop = triesContainer.scrollHeight
    
    // // Clear any existing content, but keep the submit button
    while (promptContainer.firstChild && promptContainer.firstChild.id !== 'submit-button') {
        promptContainer.firstChild.remove();
    }

    input_count = 0
    input_elems = []
    tokens.forEach((token, index) => {
        if (masks.includes(index)) {
            var score = parseFloat(promptData.scores[index]);
            const inputField = document.createElement("input");
            const span = document.createElement("span");        

            if (score > 0) {
                if (score > 0.1) {
                    var ph = `${(score * 100).toFixed(2)}`;
                } else {
                    var ph = "try again";
                }
            } else {
                var ph = "";
            }

            span.textContent = " ";
            promptContainer.appendChild(span);
            inputField.type = "text";
            inputField.id = `${index}`;
            inputField.placeholder = ph; //(score > 0) ? `${(score * 100).toFixed(2)} %` : "Way Off...";
            inputField.style.border = 'none';
            inputField.style.backgroundColor = 'black';
            inputField.style.color = 'white';
            inputField.style.fontSize = "18px";
            inputField.style.textAlign = 'center';
            inputField.style.fontFamily = "Courier New, monospace";
            inputField.style.margin = "3px";
            inputField.style.transition = 'background 0.3s';

            // Add hover effect
            inputField.onmouseover = function() {
                inputField.focus()
            };

            // Add onfocus effect
            inputField.onfocus = function() {
                last_focus = input_count
            };

            input_elems.push(inputField)
            input_count = input_count + 1

            promptContainer.appendChild(inputField);
        } else {
            // Otherwise, add a span with the token
            const span = document.createElement("span");
            if ((token === ".") || (token === ",")) {
                span.textContent = token;
            } else {
                span.textContent = " " + token;
            }
            span.style.fontSize = "18px";
            span.style.fontFamily = "Courier New, monospace";
            span.style.fontWeight = correct.includes(index) ? 'bold' : 'normal';
            span.style.color = correct.includes(index) ? '#66FF99' : 'white';
            // span.style.margin = "3px";
            promptContainer.appendChild(span);
        }
    });

    if (input_elems.length > 0) {
        input_elems[0].focus();
    }

    // Ensure the submit button is appended last
    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
        if (masks.length > 0) {
            // If there are masks, ensure the button is attached and visible
            submitButton.style.display = 'block';
        } else {
            // Otherwise, hide the button
            submitButton.style.display = 'none';
        }
    }
}

function flashRed(input) {
    input.style.background = 'red';
    setTimeout(() => {
        input.style.background = 'black';
    }, 150);
}

function submitInputs(app) {
    const inputs = {};
    const promptContainer = document.getElementById("prompt-container");
    
    // Get all input fields
    const inputFields = promptContainer.querySelectorAll("input");
    inputFields.forEach(input => {
        input.addEventListener('input', function() {
            if (!isNaN(parseFloat(this.value))) {
                this.value = '';
            }
        });
    });

    let hasAnyTypos = false;
    
    inputFields.forEach(input => {
        if (hasTypo(input.value)) {
            // Flash the input red if it has a typo
            flashRed(input);
            hasAnyTypos = true;
        } else {
            // inputs.push(input.value);
            inputs[input.id] = input.value;
        }
    });

    // If any input has a typo, don't send the data to the server
    if (hasAnyTypos) return;

    fetch("./compute_score", {
        method: "POST",
        credentials: 'include',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs })
    })
    .then(response => response.json())
    .then(data => {
        if (parseInt(data.won) === 1) {
            app.fetchAndDisplayContents(false);
        } else {
            app.fetchAndDisplayContents(true);
        }
    })
    .catch(error => {
        console.error("Error submitting data:", error);
    });
}

function hasTypo(inputValue) {
    if (inputValue === ' ' || inputValue === '') {
        return true;
    }

    if (/\s/.test(inputValue)) {
        return true;
    }    

    const symbolsRegex = /[^a-zA-Z0-9\s]/;
    const consecutiveSpacesRegex = /\s{2,}/;

    if (symbolsRegex.test(inputValue)) {
        console.log("Symbols detected");
        return true;
    }

    if (consecutiveSpacesRegex.test(inputValue)) {
        console.log("Consecutive spaces detected");
        return true;
    }

    const words = inputValue.split(/\s+/);
    for (const word of words) {
        if (dictionary && !dictionary.check(word)) {
            return true;
        }
    }
    return false;
}