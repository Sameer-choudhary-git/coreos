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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  },

  saveProfile(input: SaveUserProfileInput) {
    return prisma.user.upsert({
      where: { id: input.id },
      create: {
        ...input,
        role: "APPLICANT",
      },
      update: {
        name: input.name,
        email: input.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  },
};