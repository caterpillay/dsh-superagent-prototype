/** Stable identifiers in the fixed worker role catalog. */
export const ROLE_IDS = ['product-manager', 'qa', 'rank-programmer', 'api-programmer'] as const
export type RoleId = typeof ROLE_IDS[number]

/** Fixed worker roles the main Session chooses when accepting work. Role choice does not affect authorization. */
export const ROLES = [
  { id: 'product-manager', name: 'Product Manager', responsibilities: 'Define product requirements, scope, priorities, and acceptance criteria.' },
  { id: 'qa', name: 'QA', responsibilities: 'Verify expected behavior, test coverage, regressions, and release quality.' },
  { id: 'rank-programmer', name: 'Rank Programmer', responsibilities: 'Implement and maintain ranking logic, algorithms, data flows, and performance.' },
  { id: 'api-programmer', name: 'API Programmer', responsibilities: 'Implement and maintain API contracts, service logic, integrations, and reliability.' },
] as const satisfies readonly { id: RoleId; name: string; responsibilities: string }[]

/** One entry in the fixed worker role catalog. */
export type Role = typeof ROLES[number]
/** Resolve a fixed role by id. */
export const roleOf = (id: RoleId): Role => ROLES.find(role => role.id === id)!
