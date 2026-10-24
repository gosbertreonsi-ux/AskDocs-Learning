export type Role = "user" | "ai";

export interface Message {
  id: number;
  role: Role;
  text: string;
}