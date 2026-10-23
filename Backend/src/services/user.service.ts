import { prisma } from "../db/prisma.js";

type SaveUserProfileInput = {
  id: string;
  name: string;
  email: string;
};

export const userService = {
  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  saveProfile(input: SaveUserProfileInput) {
    return prisma.user.upsert({
      where: { id: input.id },

      create: input,

      update: {
        name: input.name,
        email: input.email,
      },
    });
  },
};