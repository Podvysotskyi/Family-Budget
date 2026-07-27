import type { ObjectLiteral, Repository } from 'typeorm'
import { vi } from 'vitest'

export function asRepository<Entity extends ObjectLiteral>(value: object) {
  return value as Repository<Entity>
}

export function createFluentQuery(overrides: Record<string, ReturnType<typeof vi.fn>>) {
  const query = {
    addOrderBy: vi.fn(),
    andWhere: vi.fn(),
    execute: vi.fn(),
    getMany: vi.fn(),
    getRawOne: vi.fn(),
    innerJoin: vi.fn(),
    insert: vi.fn(),
    into: vi.fn(),
    leftJoinAndSelect: vi.fn(),
    orIgnore: vi.fn(),
    orderBy: vi.fn(),
    returning: vi.fn(),
    select: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    values: vi.fn(),
    where: vi.fn(),
    ...overrides
  }

  for (const method of Object.values(query)) {
    if (!method.getMockImplementation()) {
      method.mockReturnValue(query)
    }
  }

  return query
}
