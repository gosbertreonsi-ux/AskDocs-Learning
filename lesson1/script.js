const form = document.querySelector("form");
const input = document.querySelector("#question");
const messagesEl = document.querySelector("#messages");

// The data: an array of message objects
let messages = [
  { id: 1, role: "ai", text: "Hello! Ask me about your documents." },
];

// Draw the data onto the page
function render() {
  messagesEl.innerHTML = "";                 // clear old messages
  for (const m of messages) {
    const p = document.createElement("p");
    p.className = `message ${m.role}`;
    p.textContent = m.text;                  // textContent is safe from HTML injection
    messagesEl.appendChild(p);
  }
}

function addMessage(role, text) {
  messages.push({ id: Date.now(), role, text });
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();                    // stop the page from reloading
  const text = input.value.trim();
  if (text === "") return;                   // ignore empty messages

  addMessage("user", text);
  input.value = "";

  // Fake AI reply after 1 second (the real AI comes in Phase 4)
  setTimeout(() => {
    addMessage("ai", "You asked: " + text);
  }, 1000);
});

render();


//somethings take time example code
async function loadJoke() {
  const response = await fetch("https://api.chucknorris.io/jokes/random");
  const data = await response.json();
  console.log(data.value);
}

loadJoke();
