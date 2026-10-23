import { prisma } from "../db/prisma.js";

export const demoItemService = {
  // CREATE
  create(name: string) {
    return prisma.demoItem.create({
      data: { name },
    });
  },

  // READ ALL
  findAll() {
    return prisma.demoItem.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  // READ ONE
  findById(id: number) {
    return prisma.demoItem.findUnique({
      where: { id },
    });
  },

  // UPDATE
  async update(id: number, name: string) {
    const result = await prisma.demoItem.updateMany({
      where: { id },
      data: { name },
    });

    if (result.count === 0) {
      return null;
    }

    return prisma.demoItem.findUnique({
      where: { id },
    });
  },

  // DELETE
  async delete(id: number) {
    const result = await prisma.demoItem.deleteMany({
      where: { id },
    });

    return result.count > 0;
  },
};