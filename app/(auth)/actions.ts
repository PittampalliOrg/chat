"use server"

import { z } from "zod"
import { createUser, getUser } from "@/lib/db/queries"
import { signIn } from "./auth"

// Create a utility function to get the base URL
const getBaseUrl = () => {
  const baseUrl = process.env.NEXTAUTH_URL
  if (!baseUrl) {
    console.error("NEXTAUTH_URL environment variable is not set")
    throw new Error("NEXTAUTH_URL environment variable is not set")
  }
  return baseUrl
}

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export interface LoginActionState {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data"
}

export const login = async (_: LoginActionState, formData: FormData): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    })

    // Use callbackUrl with absolute path if needed
    const result = await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
      // If you need to specify a callbackUrl, use an absolute URL
      // callbackUrl: `${getBaseUrl()}/dashboard`,
    })

    return { status: "success" }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" }
    }

    return { status: "failed" }
  }
}

export interface RegisterActionState {
  status: "idle" | "in_progress" | "success" | "failed" | "user_exists" | "invalid_data"
}

export const register = async (_: RegisterActionState, formData: FormData): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    })

    const [user] = await getUser(validatedData.email)

    if (user) {
      return { status: "user_exists" } as RegisterActionState
    }
    await createUser(validatedData.email, validatedData.password)

    // Use callbackUrl with absolute path if needed
    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
      // If you need to specify a callbackUrl, use an absolute URL
      // callbackUrl: `${getBaseUrl()}/dashboard`,
    })

    return { status: "success" }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" }
    }

    return { status: "failed" }
  }
}
