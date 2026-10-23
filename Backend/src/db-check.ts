import { prisma } from "./db/prisma.js";

async function main() {
  const item = await prisma.demoItem.create({
    data: {
      name: "Supabase connection test",
    },
  });

  console.log("Created:", item);

  const items = await prisma.demoItem.findMany();

  console.log("All items:", items);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });