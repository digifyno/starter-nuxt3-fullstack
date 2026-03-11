import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('Password123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      password: hashedPassword,
      tasks: {
        create: [
          { title: 'Learn Nuxt 3', description: 'Explore the Nuxt 3 framework and its features', completed: true },
          { title: 'Build a fullstack app', description: 'Create a production-ready application with Prisma and auth' },
          { title: 'Deploy to production', description: 'Set up CI/CD and deploy the application' },
        ],
      },
    },
  })

  console.log(`Seeded user: ${user.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
