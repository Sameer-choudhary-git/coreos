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

  createProfile(input: SaveUserProfileInput) {
    return prisma.user.create({
      data: {
        ...input,
        role: "APPLICANT",
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

  updateProfile(input: SaveUserProfileInput) {
    return prisma.user.update({
      where: { id: input.id },
      data: {
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