import { MongoClient, type Collection, type Db } from 'mongodb';
import { env } from './env.js';
import { logger } from '../lib/logger.js';
import type {
  CareerTrajectoryDoc,
  CourseDoc,
  JobDoc,
  RoadmapEdgeDoc,
  SkillDoc,
  SkillTransitionDoc,
} from '../schemas/index.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;

  logger.info({ db: env.MONGODB_DB }, 'Connecting to MongoDB Atlas...');

  client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 5,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
  });

  await client.connect();
  db = client.db(env.MONGODB_DB);

  await db.command({ ping: 1 });
  logger.info('MongoDB connected!');

  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongo() first.');
  }
  return db;
}

export async function disconnectMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB disconnected');
  }
}

export const collections = {
  jobs: () => getDb().collection<JobDoc>('jobs'),
  skills: () => getDb().collection<SkillDoc>('skills'),
  courses: () => getDb().collection<CourseDoc>('courses'),
  careerTrajectories: () => getDb().collection<CareerTrajectoryDoc>('career_trajectories'),
  skillTransitions: () => getDb().collection<SkillTransitionDoc>('skill_transitions'),
  roadmapEdges: () => getDb().collection<RoadmapEdgeDoc>('roadmap_edges'),
} as const;

export type CollectionsMap = {
  jobs: Collection<JobDoc>;
  skills: Collection<SkillDoc>;
  courses: Collection<CourseDoc>;
  careerTrajectories: Collection<CareerTrajectoryDoc>;
  skillTransitions: Collection<SkillTransitionDoc>;
  roadmapEdges: Collection<RoadmapEdgeDoc>;
};

export async function isMongoHealthy(): Promise<boolean> {
  try {
    if (!db) return false;
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
