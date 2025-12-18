export function prismaModelTemplate(name: string, pascalName: string, tableName: string): string {
  return `
// Add this model to your prisma/schema.prisma file

model ${pascalName} {
  id          String   @id @default(uuid())
  name        String
  description String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
  @@map("${tableName}")
}
`;
}
