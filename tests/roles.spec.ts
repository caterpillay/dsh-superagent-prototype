import { describe, expect, it } from 'vitest'
import type { Assignment, Ticket } from '../src/core/index.ts'
import { ROLE_IDS } from '../src/core/roles.ts'
import { legacyTicketOfSession, legacyWorkerSessionId, RoleLeaseBusy, RoleLeases, roleSessionId, workerSessionIdOf } from '../src/executor/roles.ts'

const assignment = (id: string): Assignment => ({ id, state: 'pending', createdAt: '2026-01-01T00:00:00.000Z' })
const ticket = (id: string, roleId?: typeof ROLE_IDS[number]): Ticket => ({ id, title: id, decisionId: `decision-${id}`,
  mandate: {} as Ticket['mandate'], channels: [], assignments: [], inputs: [], undelivered: [], createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z', origin: { triggerId: `trigger-${id}`, triggerIds: [`trigger-${id}`] },
  execution: { name: id, directory: `/tmp/${id}`, assignment: '', ...(roleId ? { roleId } : {}) } })

describe('shared role Session leases', () => {
  it('maps fixed roles to stable Sessions and preserves legacy Ticket Sessions', () => {
    expect(ROLE_IDS.map(roleSessionId)).toEqual(ROLE_IDS.map(id => `worker-${id}`))
    expect(workerSessionIdOf(ticket('a', 'qa'))).toBe('worker-qa')
    expect(workerSessionIdOf(ticket('legacy'))).toBe(legacyWorkerSessionId('legacy'))
    expect(legacyTicketOfSession('worker-qa')).toBeUndefined()
    expect(legacyTicketOfSession('worker-legacy')).toBe('legacy')
  })

  it('serializes same-role Tickets while different roles lease independently', () => {
    const leases = new RoleLeases(), a = ticket('a', 'qa'), b = ticket('b', 'qa'), c = ticket('c', 'product-manager')
    const first = leases.acquire(a, assignment('aa'))!
    expect(() => leases.acquire(b, assignment('bb'))).toThrow(RoleLeaseBusy)
    expect(leases.acquire(c, assignment('cc'))?.sessionId).toBe('worker-product-manager')
    expect(leases.release(first)).toBe(true)
    expect(leases.acquire(b, assignment('bb'))?.generation).toBe(2)
  })

  it('does not let stale cleanup release a newer lease', () => {
    const leases = new RoleLeases(), a = ticket('a', 'api-programmer'), b = ticket('b', 'api-programmer')
    const old = leases.acquire(a, assignment('aa'))!
    leases.release(old)
    const current = leases.acquire(b, assignment('bb'))!
    expect(leases.release(old)).toBe(false)
    expect(leases.session(current.sessionId)).toBe(current)
  })
})
