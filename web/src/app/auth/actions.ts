"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new Error("User with this email already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      name: name || email.split("@")[0],
      password: hashedPassword,
    } as any, // bypass TS type check since password is in schema but TS gen might lag
  });

  return user;
}
