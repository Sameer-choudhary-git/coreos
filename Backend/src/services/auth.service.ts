import { createClient } from "@supabase/supabase-js";
import { userService } from "./user.service.js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

export const authService = {
  async register(input: RegisterInput) {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { name: input.name },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error("Supabase did not return a user");
    }

    const user = await userService.createProfile({
      id: data.user.id,
      name: input.name,
      email: input.email,
    });

    return {
      user,
      session: data.session,
      emailConfirmationRequired: !data.session,
    };
  },

  async login(input: LoginInput) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw new Error("Invalid email or password");
    }

    if (!data.user || !data.session) {
      throw new Error("Login session was not created");
    }

    const user = await userService.findById(data.user.id);

    if (!user) {
      throw new Error("User profile not found");
    }

    return {
      user,
      session: data.session,
    };
  },

  async getProfile(userId: string) {
    const user = await userService.findById(userId);

    if (!user) {
      throw new Error("User profile not found");
    }

    return user;
  },
};