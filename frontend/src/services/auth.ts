import type { User, TokenResponse } from "../types";
import { api } from "./api";

export async function register(payload: {
  email: string;
  username: string;
  password: string;
}): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/register", payload);
  return data;
}

export async function login(payload: { email: string; password: string }): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/login", payload);
  return data;
}

export async function me(): Promise<User> {
  const { data } = await api.get<User>("/me");
  return data;
}
