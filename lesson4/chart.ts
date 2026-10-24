type Role = "user" | "ai";

interface Message {
  id: number;
  role: Role;
  text: string;
}

let messages: Message[] = [
  { id: 1, role: "ai", text: "Hello! Ask me about your documents." },
];

function addMessage(role: Role, text: string): void {
  messages = [...messages, { id: Date.now(), role, text }];
}

function countByRole(role: Role): number {
  return messages.filter(m => m.role === role).length;
}

addMessage("user", "What is the refund policy?");
addMessage("ai", "Refunds are allowed within 30 days.");

console.log(messages);
console.log("User messages:", countByRole("user"));