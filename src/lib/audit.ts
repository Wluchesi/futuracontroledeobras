import { prisma } from './prisma';

export async function logAuditAction({
  userId,
  userName = 'Sistema',
  action,
  entityName,
  entityId,
  previousValue,
  newValue,
  details,
}: {
  userId?: string;
  userName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityName: string;
  entityId: string;
  previousValue?: any;
  newValue?: any;
  details?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userName,
        action,
        entityName,
        entityId,
        previousValue: previousValue ? JSON.stringify(previousValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        details,
      },
    });
  } catch (error) {
    console.error('Audit log failure:', error);
  }
}
