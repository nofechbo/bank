import { PrismaClient } from "@prisma/client/index";

export const dbInstance = new PrismaClient();  // singleton

export type DbUser = Awaited<ReturnType<typeof dbInstance.user.findUnique>>;




/*let prismaClient: PrismaClient | null = null;

export const dbInstance = () => {
    if (!prismaClient) {
        prismaClient = new PrismaClient;
    }

    return prismaClient;
}*/