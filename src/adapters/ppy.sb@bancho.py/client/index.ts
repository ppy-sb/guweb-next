import {
  PrismaClient,
} from '@prisma/client' // ppy.sb
import * as BanchoPy from '~/adapters/bancho.py@mysql5.7/client'

export const prismaClient = new PrismaClient()

export const LeaderboardDataProvider = BanchoPy.LeaderboardDataProvider
export const UserRelationshipDataProvider = BanchoPy.UserRelationshipDataProvider
// export const UserDataProvider = BanchoPy.UserDataProvider
export { UserDataProvider } from './user'
export const MapDataProvider = BanchoPy.MapDataProvider
