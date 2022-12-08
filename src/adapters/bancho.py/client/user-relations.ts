import type { PrismaClient } from '@prisma/client'
import type { IdType as Id } from '../config'
import { dedupeUserRelationship, toBaseUser } from '../transforms'

import { UserRelationshipDataProvider } from '../../base/client/user-relations'
import { prismaClient } from './index'
import type { BaseUser } from '~/types/user'
import type { Relationship } from '~/types/common'
import { calculateMutualRelationships } from '~/server/transforms'

export default class BanchoPyUserRelationship extends UserRelationshipDataProvider<Id> implements UserRelationshipDataProvider<Id> {
  db: PrismaClient
  constructor({ client }: { client: PrismaClient } = { client: prismaClient }) {
    super()
    this.db = client
  }

  async getOneRelationship(fromUser: { id: Id }, toUser: { id: Id }) {
    const relationships = await prismaClient.relationship.findFirst({
      where: {
        fromUserId: fromUser.id,
        toUserId: toUser.id,
      },
      select: {
        type: true,
      },
    })
    return relationships?.type
  }

  async getRelationships({ user }: { user: { id: Id } }) {
    const pRelationResult = prismaClient.relationship.findMany({
      where: {
        fromUserId: user.id,
      },
      select: {
        type: true,
        toUser: true,
        toUserId: true,
      },
    })
    const pGotRelationResult = prismaClient.relationship.findMany({
      where: {
        toUserId: user.id,
      },
      select: {
        type: true,
        fromUserId: true,
      },
    })

    const [relationships, gotRelationships] = await Promise.all([pRelationResult, pGotRelationResult])

    const asBaseUserShape = relationships.map(r => ({
      ...r,
      toUser: toBaseUser({ user: r.toUser }),
    }))
    const deduped = dedupeUserRelationship(asBaseUserShape)

    for (const _user of deduped) {
      const reverse = gotRelationships.filter(reverse => reverse.fromUserId === user.id).map(reverse => reverse.type)
      _user.relationshipFromTarget = reverse || []
      _user.mutualRelationship = calculateMutualRelationships(_user.relationship, _user.relationshipFromTarget)
    }

    return deduped
  }

  async removeOneRelationship({ fromUser, targetUser, type }: { fromUser: BaseUser<Id>; targetUser: BaseUser<Id>; type: Relationship }) {
  // bancho.py only allows one relationshipType per direction per one user pair
  // so cannot delete with where condition due to prisma not allowing it.
  // So to make sure that we are removing right relationship, we have to compare
  // relation type against input before remove it.
    const relationship = await this.getOneRelationship(fromUser, targetUser)

    if (relationship !== type)
      throw new Error('not-found')

    await prismaClient.relationship.delete({
      where: {
        fromUserId_toUserId: {
          fromUserId: fromUser.id,
          toUserId: targetUser.id,
        },
      },
    })
  }

  // TODO: handle the situation where toUser could be null.
  async countRelationship({ user, type }: { user: BaseUser<Id>; type: Relationship }) {
    return await prismaClient.relationship.count({
      where: {
        toUserId: user.id,
        type,
      },
    })
  }
}

