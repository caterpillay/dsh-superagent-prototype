/** Shared role-Session identities and in-memory exclusive leases. */
import type { Assignment, Ticket } from '../core/index.ts'
import { ROLE_IDS, type RoleId } from '../core/roles.ts'

/** Legacy one-ticket worker Session id. */
export const legacyWorkerSessionId = (ticketId: string): string => `worker-${ticketId}`
/** Stable Session id shared by every Ticket assigned to one fixed role. */
export const roleSessionId = (roleId: RoleId): string => `worker-${roleId}`
/** Session id selected for a Ticket; legacy stored Tickets keep their historical per-ticket Session. */
export const workerSessionIdOf = (ticket: Pick<Ticket, 'id' | 'execution'>): string =>
  ticket.execution?.roleId ? roleSessionId(ticket.execution.roleId) : legacyWorkerSessionId(ticket.id)
/** Ticket id encoded by a legacy worker Session, never by a shared role Session. */
export const legacyTicketOfSession = (sessionId: string): string | undefined =>
  sessionId.startsWith('worker-') && !ROLE_IDS.some(roleId => roleSessionId(roleId) === sessionId) ? sessionId.slice('worker-'.length) : undefined

/** Exclusive ownership of one shared role Session by one Ticket Assignment. */
export interface RoleLease {
  sessionId: string
  roleId: RoleId
  ticketId: string
  assignmentId: string
  generation: number
}

/** Raised when another Ticket currently owns a shared role Session. */
export class RoleLeaseBusy extends Error {
  constructor(readonly current: RoleLease) { super(`Role ${current.roleId} is busy with ticket ${current.ticketId}`) }
}

/** Process-local role lease registry; durable Ticket/Assignment state reconstructs it after restart. */
export class RoleLeases {
  private readonly sessions = new Map<string, RoleLease>()
  private readonly tickets = new Map<string, RoleLease>()
  private readonly generations = new Map<string, number>()

  acquire(ticket: Ticket, assignment: Assignment): RoleLease | undefined {
    const roleId = ticket.execution?.roleId
    if (!roleId) return undefined
    const sessionId = roleSessionId(roleId)
    const current = this.sessions.get(sessionId)
    if (current) {
      if (current.ticketId === ticket.id && current.assignmentId === assignment.id) return current
      throw new RoleLeaseBusy(current)
    }
    const lease: RoleLease = { sessionId, roleId, ticketId: ticket.id, assignmentId: assignment.id,
      generation: (this.generations.get(sessionId) ?? 0) + 1 }
    this.generations.set(sessionId, lease.generation)
    this.sessions.set(sessionId, lease)
    this.tickets.set(ticket.id, lease)
    return lease
  }

  session(sessionId: string): RoleLease | undefined { return this.sessions.get(sessionId) }
  ticket(ticketId: string): RoleLease | undefined { return this.tickets.get(ticketId) }
  owns(lease: RoleLease | undefined): boolean {
    return !!lease && this.sessions.get(lease.sessionId) === lease && this.tickets.get(lease.ticketId) === lease
  }
  release(lease: RoleLease | undefined): boolean {
    if (!lease || !this.owns(lease)) return false
    this.sessions.delete(lease.sessionId)
    this.tickets.delete(lease.ticketId)
    return true
  }
  list(): RoleLease[] { return [...this.sessions.values()] }
}
