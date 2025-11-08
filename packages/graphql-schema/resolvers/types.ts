import { GraphQLResolveInfo } from 'graphql';
import { GraphQLContext } from '../../services/api/src/types/context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Connection = {
  __typename?: 'Connection';
  connectionType: ConnectionType;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  label?: Maybe<Scalars['String']['output']>;
  projectId: Scalars['ID']['output'];
  sourceSnippetId: Scalars['ID']['output'];
  targetSnippetId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
};

export enum ConnectionDirection {
  Both = 'BOTH',
  Incoming = 'INCOMING',
  Outgoing = 'OUTGOING'
}

export type ConnectionStats = {
  __typename?: 'ConnectionStats';
  connectionsByType: Array<ConnectionTypeCount>;
  mostConnectedSnippets: Array<SnippetConnectionStat>;
  totalConnections: Scalars['Int']['output'];
};

export enum ConnectionType {
  Contains = 'CONTAINS',
  Contradicts = 'CONTRADICTS',
  Custom = 'CUSTOM',
  DependsOn = 'DEPENDS_ON',
  Extends = 'EXTENDS',
  References = 'REFERENCES',
  Related = 'RELATED',
  Similar = 'SIMILAR',
  Supports = 'SUPPORTS'
}

export type ConnectionTypeCount = {
  __typename?: 'ConnectionTypeCount';
  count: Scalars['Int']['output'];
  type: ConnectionType;
};

export type CreateConnectionInput = {
  label?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['ID']['input'];
  sourceSnippetId: Scalars['ID']['input'];
  targetSnippetId: Scalars['ID']['input'];
};

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateScenesInput = {
  maxTokens?: InputMaybe<Scalars['Int']['input']>;
  modelId: Scalars['ID']['input'];
  prompt: Scalars['String']['input'];
  temperature?: InputMaybe<Scalars['Float']['input']>;
};

export type CreateScenesResult = {
  __typename?: 'CreateScenesResult';
  cost: Scalars['Float']['output'];
  generationTimeMs: Scalars['Int']['output'];
  modelUsed: Scalars['String']['output'];
  scenes: Array<Snippet>;
  tokensUsed: Scalars['Int']['output'];
};

export type CreateSnippetInput = {
  categories?: InputMaybe<Array<Scalars['String']['input']>>;
  createdFrom?: InputMaybe<Scalars['ID']['input']>;
  position: PositionInput;
  projectId: Scalars['ID']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  textField1?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type GenerateContentInput = {
  maxTokens?: InputMaybe<Scalars['Int']['input']>;
  modelId: Scalars['ID']['input'];
  prompt: Scalars['String']['input'];
  systemPrompt?: InputMaybe<Scalars['String']['input']>;
  temperature?: InputMaybe<Scalars['Float']['input']>;
};

export enum GenerationModality {
  TextAndImageToImage = 'TEXT_AND_IMAGE_TO_IMAGE',
  TextToAudio = 'TEXT_TO_AUDIO',
  TextToImage = 'TEXT_TO_IMAGE',
  TextToText = 'TEXT_TO_TEXT',
  TextToVideo = 'TEXT_TO_VIDEO'
}

export type GenerationRecord = {
  __typename?: 'GenerationRecord';
  cost: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  generationTimeMs: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  modelId: Scalars['String']['output'];
  modelProvider: Scalars['String']['output'];
  projectId: Scalars['ID']['output'];
  prompt: Scalars['String']['output'];
  result: Scalars['String']['output'];
  snippetId: Scalars['ID']['output'];
  systemPrompt?: Maybe<Scalars['String']['output']>;
  tokensUsed: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
};

export type GenerationResult = {
  __typename?: 'GenerationResult';
  content: Scalars['String']['output'];
  cost: Scalars['Float']['output'];
  generationTimeMs: Scalars['Int']['output'];
  modelUsed: Scalars['String']['output'];
  tokensUsed: Scalars['Int']['output'];
};

export type GenerationStreamEvent = {
  __typename?: 'GenerationStreamEvent';
  content?: Maybe<Scalars['String']['output']>;
  isComplete: Scalars['Boolean']['output'];
  snippetId: Scalars['ID']['output'];
  tokensUsed?: Maybe<Scalars['Int']['output']>;
};

export type GenerationStreamEventInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  isComplete: Scalars['Boolean']['input'];
  snippetId: Scalars['ID']['input'];
  tokensUsed?: InputMaybe<Scalars['Int']['input']>;
};

export type GraphNode = {
  __typename?: 'GraphNode';
  connections: Array<Connection>;
  depth: Scalars['Int']['output'];
  snippetId: Scalars['ID']['output'];
};

export type GraphTraversalResult = {
  __typename?: 'GraphTraversalResult';
  connections: Array<Connection>;
  maxDepthReached: Scalars['Int']['output'];
  nodes: Array<GraphNode>;
  totalNodes: Scalars['Int']['output'];
};

export type ImageMetadata = {
  __typename?: 'ImageMetadata';
  aspectRatio: Scalars['String']['output'];
  height: Scalars['Int']['output'];
  width: Scalars['Int']['output'];
};

export type ModelConfig = {
  __typename?: 'ModelConfig';
  costPerToken?: Maybe<Scalars['Float']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  displayName: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  maxTokens?: Maybe<Scalars['Int']['output']>;
  modality: GenerationModality;
  modelId: Scalars['String']['output'];
  provider: ModelProvider;
};

export enum ModelProvider {
  Anthropic = 'ANTHROPIC',
  Custom = 'CUSTOM',
  Gemini = 'GEMINI',
  Openai = 'OPENAI',
  Vidu = 'VIDU'
}

export type Mutation = {
  __typename?: 'Mutation';
  combineSnippetConnections: Snippet;
  createConnection: Connection;
  createProject: Project;
  createScenes: CreateScenesResult;
  createSnippet: Snippet;
  createUser: User;
  deleteConnection: Scalars['Boolean']['output'];
  deleteProject: Scalars['Boolean']['output'];
  deleteSnippet: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  generateContent: GenerationResult;
  generateContentStream: GenerationResult;
  generateSnippetImage: Snippet;
  generateSnippetVideo: Snippet;
  publishGenerationStreamEvent: GenerationStreamEvent;
  resetUserPassword: Scalars['String']['output'];
  revertSnippet: Snippet;
  updateConnection: Connection;
  updateProject: Project;
  updateSnippet: Snippet;
  updateSnippetPositions: Array<Snippet>;
};


export type MutationCombineSnippetConnectionsArgs = {
  projectId: Scalars['ID']['input'];
  snippetId: Scalars['ID']['input'];
};


export type MutationCreateConnectionArgs = {
  input: CreateConnectionInput;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationCreateScenesArgs = {
  input: CreateScenesInput;
  projectId: Scalars['ID']['input'];
  snippetId: Scalars['ID']['input'];
};


export type MutationCreateSnippetArgs = {
  input: CreateSnippetInput;
};


export type MutationCreateUserArgs = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  temporaryPassword: Scalars['String']['input'];
};


export type MutationDeleteConnectionArgs = {
  connectionId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSnippetArgs = {
  id: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationGenerateContentArgs = {
  input: GenerateContentInput;
  projectId: Scalars['ID']['input'];
  snippetId: Scalars['ID']['input'];
};


export type MutationGenerateContentStreamArgs = {
  input: GenerateContentInput;
  projectId: Scalars['ID']['input'];
  snippetId: Scalars['ID']['input'];
};


export type MutationGenerateSnippetImageArgs = {
  modelId?: InputMaybe<Scalars['ID']['input']>;
  projectId: Scalars['ID']['input'];
  snippetId: Scalars['ID']['input'];
};


export type MutationGenerateSnippetVideoArgs = {
  aspectRatio?: InputMaybe<Scalars['String']['input']>;
  duration?: InputMaybe<Scalars['Int']['input']>;
  modelId: Scalars['ID']['input'];
  movementAmplitude?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['ID']['input'];
  resolution?: InputMaybe<Scalars['String']['input']>;
  seed?: InputMaybe<Scalars['Int']['input']>;
  snippetId: Scalars['ID']['input'];
  style?: InputMaybe<Scalars['String']['input']>;
};


export type MutationPublishGenerationStreamEventArgs = {
  input: GenerationStreamEventInput;
};


export type MutationResetUserPasswordArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevertSnippetArgs = {
  id: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  version: Scalars['Int']['input'];
};


export type MutationUpdateConnectionArgs = {
  id: Scalars['ID']['input'];
  input: UpdateConnectionInput;
};


export type MutationUpdateProjectArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProjectInput;
};


export type MutationUpdateSnippetArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSnippetInput;
  projectId: Scalars['ID']['input'];
};


export type MutationUpdateSnippetPositionsArgs = {
  projectId: Scalars['ID']['input'];
  updates: Array<UpdateSnippetPositionInput>;
};

export type Position = {
  __typename?: 'Position';
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
};

export type PositionInput = {
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

export type Project = {
  __typename?: 'Project';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastModified: Scalars['String']['output'];
  name: Scalars['String']['output'];
  snippets?: Maybe<Array<Snippet>>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  availableModels: Array<ModelConfig>;
  connectionStats: ConnectionStats;
  connectionsByType: Array<Connection>;
  exploreGraph: GraphTraversalResult;
  generationHistory: Array<GenerationRecord>;
  me?: Maybe<User>;
  project?: Maybe<Project>;
  projectConnections: Array<Connection>;
  projects: Array<Project>;
  snippet?: Maybe<Snippet>;
  snippetConnections: Array<Connection>;
  snippetVersions: Array<SnippetVersion>;
  systemAnalytics: SystemAnalytics;
  users: Array<User>;
};


export type QueryAvailableModelsArgs = {
  modality?: InputMaybe<GenerationModality>;
};


export type QueryConnectionStatsArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryConnectionsByTypeArgs = {
  connectionType: ConnectionType;
  limit?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['ID']['input'];
};


export type QueryExploreGraphArgs = {
  connectionTypes?: InputMaybe<Array<ConnectionType>>;
  direction?: InputMaybe<ConnectionDirection>;
  maxDepth?: InputMaybe<Scalars['Int']['input']>;
  snippetId: Scalars['ID']['input'];
};


export type QueryGenerationHistoryArgs = {
  snippetId: Scalars['ID']['input'];
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProjectConnectionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['ID']['input'];
};


export type QuerySnippetArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySnippetConnectionsArgs = {
  direction?: InputMaybe<ConnectionDirection>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  snippetId: Scalars['ID']['input'];
};


export type QuerySnippetVersionsArgs = {
  snippetId: Scalars['ID']['input'];
};

export type Snippet = {
  __typename?: 'Snippet';
  categories: Array<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  createdFrom?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  imageMetadata?: Maybe<ImageMetadata>;
  imageS3Key?: Maybe<Scalars['String']['output']>;
  imageUrl?: Maybe<Scalars['String']['output']>;
  position: Position;
  projectId: Scalars['ID']['output'];
  tags: Array<Scalars['String']['output']>;
  textField1: Scalars['String']['output'];
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
  versions: Array<SnippetVersion>;
  videoMetadata?: Maybe<VideoMetadata>;
  videoS3Key?: Maybe<Scalars['String']['output']>;
  videoUrl?: Maybe<Scalars['String']['output']>;
};

export type SnippetConnectionStat = {
  __typename?: 'SnippetConnectionStat';
  connectionCount: Scalars['Int']['output'];
  snippetId: Scalars['ID']['output'];
};

export type SnippetVersion = {
  __typename?: 'SnippetVersion';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  snippetId: Scalars['ID']['output'];
  textField1: Scalars['String']['output'];
  title?: Maybe<Scalars['String']['output']>;
  version: Scalars['Int']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  onGenerationStream?: Maybe<GenerationStreamEvent>;
};


export type SubscriptionOnGenerationStreamArgs = {
  snippetId: Scalars['ID']['input'];
};

export type SystemAnalytics = {
  __typename?: 'SystemAnalytics';
  averageSnippetsPerUser: Scalars['Float']['output'];
  totalProjects: Scalars['Int']['output'];
  totalSnippets: Scalars['Int']['output'];
  totalUsers: Scalars['Int']['output'];
};

export type UpdateConnectionInput = {
  label?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSnippetInput = {
  categories?: InputMaybe<Array<Scalars['String']['input']>>;
  position?: InputMaybe<PositionInput>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  textField1?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSnippetPositionInput = {
  position: PositionInput;
  snippetId: Scalars['ID']['input'];
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  role: UserRole;
  updatedAt: Scalars['String']['output'];
};

export enum UserRole {
  Admin = 'ADMIN',
  Standard = 'STANDARD'
}

export type VideoMetadata = {
  __typename?: 'VideoMetadata';
  aspectRatio: Scalars['String']['output'];
  duration: Scalars['Int']['output'];
  fileSize?: Maybe<Scalars['Int']['output']>;
  format: Scalars['String']['output'];
  movementAmplitude?: Maybe<Scalars['String']['output']>;
  resolution: Scalars['String']['output'];
  seed?: Maybe<Scalars['Int']['output']>;
  style?: Maybe<Scalars['String']['output']>;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Connection: ResolverTypeWrapper<Connection>;
  ConnectionDirection: ConnectionDirection;
  ConnectionStats: ResolverTypeWrapper<ConnectionStats>;
  ConnectionType: ConnectionType;
  ConnectionTypeCount: ResolverTypeWrapper<ConnectionTypeCount>;
  CreateConnectionInput: CreateConnectionInput;
  CreateProjectInput: CreateProjectInput;
  CreateScenesInput: CreateScenesInput;
  CreateScenesResult: ResolverTypeWrapper<CreateScenesResult>;
  CreateSnippetInput: CreateSnippetInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GenerateContentInput: GenerateContentInput;
  GenerationModality: GenerationModality;
  GenerationRecord: ResolverTypeWrapper<GenerationRecord>;
  GenerationResult: ResolverTypeWrapper<GenerationResult>;
  GenerationStreamEvent: ResolverTypeWrapper<GenerationStreamEvent>;
  GenerationStreamEventInput: GenerationStreamEventInput;
  GraphNode: ResolverTypeWrapper<GraphNode>;
  GraphTraversalResult: ResolverTypeWrapper<GraphTraversalResult>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  ImageMetadata: ResolverTypeWrapper<ImageMetadata>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  ModelConfig: ResolverTypeWrapper<ModelConfig>;
  ModelProvider: ModelProvider;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Position: ResolverTypeWrapper<Position>;
  PositionInput: PositionInput;
  Project: ResolverTypeWrapper<Project>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Snippet: ResolverTypeWrapper<Snippet>;
  SnippetConnectionStat: ResolverTypeWrapper<SnippetConnectionStat>;
  SnippetVersion: ResolverTypeWrapper<SnippetVersion>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
  SystemAnalytics: ResolverTypeWrapper<SystemAnalytics>;
  UpdateConnectionInput: UpdateConnectionInput;
  UpdateProjectInput: UpdateProjectInput;
  UpdateSnippetInput: UpdateSnippetInput;
  UpdateSnippetPositionInput: UpdateSnippetPositionInput;
  User: ResolverTypeWrapper<User>;
  UserRole: UserRole;
  VideoMetadata: ResolverTypeWrapper<VideoMetadata>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars['Boolean']['output'];
  Connection: Connection;
  ConnectionStats: ConnectionStats;
  ConnectionTypeCount: ConnectionTypeCount;
  CreateConnectionInput: CreateConnectionInput;
  CreateProjectInput: CreateProjectInput;
  CreateScenesInput: CreateScenesInput;
  CreateScenesResult: CreateScenesResult;
  CreateSnippetInput: CreateSnippetInput;
  Float: Scalars['Float']['output'];
  GenerateContentInput: GenerateContentInput;
  GenerationRecord: GenerationRecord;
  GenerationResult: GenerationResult;
  GenerationStreamEvent: GenerationStreamEvent;
  GenerationStreamEventInput: GenerationStreamEventInput;
  GraphNode: GraphNode;
  GraphTraversalResult: GraphTraversalResult;
  ID: Scalars['ID']['output'];
  ImageMetadata: ImageMetadata;
  Int: Scalars['Int']['output'];
  ModelConfig: ModelConfig;
  Mutation: Record<PropertyKey, never>;
  Position: Position;
  PositionInput: PositionInput;
  Project: Project;
  Query: Record<PropertyKey, never>;
  Snippet: Snippet;
  SnippetConnectionStat: SnippetConnectionStat;
  SnippetVersion: SnippetVersion;
  String: Scalars['String']['output'];
  Subscription: Record<PropertyKey, never>;
  SystemAnalytics: SystemAnalytics;
  UpdateConnectionInput: UpdateConnectionInput;
  UpdateProjectInput: UpdateProjectInput;
  UpdateSnippetInput: UpdateSnippetInput;
  UpdateSnippetPositionInput: UpdateSnippetPositionInput;
  User: User;
  VideoMetadata: VideoMetadata;
}>;

export type ConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Connection'] = ResolversParentTypes['Connection']> = ResolversObject<{
  connectionType?: Resolver<ResolversTypes['ConnectionType'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sourceSnippetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  targetSnippetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ConnectionStatsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ConnectionStats'] = ResolversParentTypes['ConnectionStats']> = ResolversObject<{
  connectionsByType?: Resolver<Array<ResolversTypes['ConnectionTypeCount']>, ParentType, ContextType>;
  mostConnectedSnippets?: Resolver<Array<ResolversTypes['SnippetConnectionStat']>, ParentType, ContextType>;
  totalConnections?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ConnectionTypeCountResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ConnectionTypeCount'] = ResolversParentTypes['ConnectionTypeCount']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ConnectionType'], ParentType, ContextType>;
}>;

export type CreateScenesResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CreateScenesResult'] = ResolversParentTypes['CreateScenesResult']> = ResolversObject<{
  cost?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  generationTimeMs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  modelUsed?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  scenes?: Resolver<Array<ResolversTypes['Snippet']>, ParentType, ContextType>;
  tokensUsed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GenerationRecordResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerationRecord'] = ResolversParentTypes['GenerationRecord']> = ResolversObject<{
  cost?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  generationTimeMs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  modelId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  modelProvider?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  prompt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  result?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  snippetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  systemPrompt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tokensUsed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GenerationResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerationResult'] = ResolversParentTypes['GenerationResult']> = ResolversObject<{
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  cost?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  generationTimeMs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  modelUsed?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tokensUsed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GenerationStreamEventResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenerationStreamEvent'] = ResolversParentTypes['GenerationStreamEvent']> = ResolversObject<{
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isComplete?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  snippetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tokensUsed?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
}>;

export type GraphNodeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GraphNode'] = ResolversParentTypes['GraphNode']> = ResolversObject<{
  connections?: Resolver<Array<ResolversTypes['Connection']>, ParentType, ContextType>;
  depth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  snippetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GraphTraversalResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GraphTraversalResult'] = ResolversParentTypes['GraphTraversalResult']> = ResolversObject<{
  connections?: Resolver<Array<ResolversTypes['Connection']>, ParentType, ContextType>;
  maxDepthReached?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['GraphNode']>, ParentType, ContextType>;
  totalNodes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ImageMetadataResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ImageMetadata'] = ResolversParentTypes['ImageMetadata']> = ResolversObject<{
  aspectRatio?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  height?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  width?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ModelConfigResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ModelConfig'] = ResolversParentTypes['ModelConfig']> = ResolversObject<{
  costPerToken?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  maxTokens?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  modality?: Resolver<ResolversTypes['GenerationModality'], ParentType, ContextType>;
  modelId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['ModelProvider'], ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  combineSnippetConnections?: Resolver<ResolversTypes['Snippet'], ParentType, ContextType, RequireFields<MutationCombineSnippetConnectionsArgs, 'projectId' | 'snippetId'>>;
  createConnection?: Resolver<ResolversTypes['Connection'], ParentType, ContextType, RequireFields<MutationCreateConnectionArgs, 'input'>>;
  createProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationCreateProjectArgs, 'input'>>;
  createScenes?: Resolver<ResolversTypes['CreateScenesResult'], ParentType, ContextType, RequireFields<MutationCreateScenesArgs, 'input' | 'projectId' | 'snippetId'>>;
  createSnippet?: Resolver<ResolversTypes['Snippet'], ParentType, ContextType, RequireFields<MutationCreateSnippetArgs, 'input'>>;
  createUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationCreateUserArgs, 'email' | 'name' | 'temporaryPassword'>>;
  deleteConnection?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteConnectionArgs, 'connectionId' | 'projectId'>>;
  deleteProject?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteProjectArgs, 'id'>>;
  deleteSnippet?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteSnippetArgs, 'id' | 'projectId'>>;
  deleteUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteUserArgs, 'id'>>;
  generateContent?: Resolver<ResolversTypes['GenerationResult'], ParentType, ContextType, RequireFields<MutationGenerateContentArgs, 'input' | 'projectId' | 'snippetId'>>;
  generateContentStream?: Resolver<ResolversTypes['GenerationResult'], ParentType, ContextType, RequireFields<MutationGenerateContentStreamArgs, 'input' | 'projectId' | 'snippetId'>>;
  generateSnippetImage?: Resolver<ResolversTypes['Snippet'], ParentType, ContextType, RequireFields<MutationGenerateSnippetImageArgs, 'projectId' | 'snippetId'>>;
  generateSnippetVideo?: Resolver<ResolversTypes['Snippet'], ParentType, ContextType, RequireFields<MutationGenerateSnippetVideoArgs, 'modelId' | 'projectId' | 'snippetId'>>;
  publishGenerationStreamEvent?: Resolver<ResolversTypes['GenerationStreamEvent'], ParentType, ContextType, RequireFields<MutationPublishGenerationStreamEventArgs, 'input'>>;
  resetUserPassword?: Resolver<ResolversTypes['String'], ParentType, ContextType, RequireFields<MutationResetUserPasswordArgs, 'id'>>;
  revertSnippet?: Resolver<ResolversTypes['Snippet'], ParentType, ContextType, RequireFields<MutationRevertSnippetArgs, 'id' | 'projectId' | 'version'>>;
  updateConnection?: Resolver<ResolversTypes['Connection'], ParentType, ContextType, RequireFields<MutationUpdateConnectionArgs, 'id' | 'input'>>;
  updateProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationUpdateProjectArgs, 'id' | 'input'>>;
  updateSnippet?: Resolver<ResolversTypes['Snippet'], ParentType, ContextType, RequireFields<MutationUpdateSnippetArgs, 'id' | 'input' | 'projectId'>>;
  updateSnippetPositions?: Resolver<Array<ResolversTypes['Snippet']>, ParentType, ContextType, RequireFields<MutationUpdateSnippetPositionsArgs, 'projectId' | 'updates'>>;
}>;

export type PositionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Position'] = ResolversParentTypes['Position']> = ResolversObject<{
  x?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  y?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type ProjectResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Project'] = ResolversParentTypes['Project']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastModified?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  snippets?: Resolver<Maybe<Array<ResolversTypes['Snippet']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  availableModels?: Resolver<Array<ResolversTypes['ModelConfig']>, ParentType, ContextType, Partial<QueryAvailableModelsArgs>>;
  connectionStats?: Resolver<ResolversTypes['ConnectionStats'], ParentType, ContextType, RequireFields<QueryConnectionStatsArgs, 'projectId'>>;
  connectionsByType?: Resolver<Array<ResolversTypes['Connection']>, ParentType, ContextType, RequireFields<QueryConnectionsByTypeArgs, 'connectionType' | 'projectId'>>;
  exploreGraph?: Resolver<ResolversTypes['GraphTraversalResult'], ParentType, ContextType, RequireFields<QueryExploreGraphArgs, 'direction' | 'snippetId'>>;
  generationHistory?: Resolver<Array<ResolversTypes['GenerationRecord']>, ParentType, ContextType, RequireFields<QueryGenerationHistoryArgs, 'snippetId'>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<QueryProjectArgs, 'id'>>;
  projectConnections?: Resolver<Array<ResolversTypes['Connection']>, ParentType, ContextType, RequireFields<QueryProjectConnectionsArgs, 'projectId'>>;
  projects?: Resolver<Array<ResolversTypes['Project']>, ParentType, ContextType>;
  snippet?: Resolver<Maybe<ResolversTypes['Snippet']>, ParentType, ContextType, RequireFields<QuerySnippetArgs, 'id'>>;
  snippetConnections?: Resolver<Array<ResolversTypes['Connection']>, ParentType, ContextType, RequireFields<QuerySnippetConnectionsArgs, 'direction' | 'snippetId'>>;
  snippetVersions?: Resolver<Array<ResolversTypes['SnippetVersion']>, ParentType, ContextType, RequireFields<QuerySnippetVersionsArgs, 'snippetId'>>;
  systemAnalytics?: Resolver<ResolversTypes['SystemAnalytics'], ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type SnippetResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Snippet'] = ResolversParentTypes['Snippet']> = ResolversObject<{
  categories?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdFrom?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageMetadata?: Resolver<Maybe<ResolversTypes['ImageMetadata']>, ParentType, ContextType>;
  imageS3Key?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Position'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  textField1?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes['SnippetVersion']>, ParentType, ContextType>;
  videoMetadata?: Resolver<Maybe<ResolversTypes['VideoMetadata']>, ParentType, ContextType>;
  videoS3Key?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  videoUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type SnippetConnectionStatResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SnippetConnectionStat'] = ResolversParentTypes['SnippetConnectionStat']> = ResolversObject<{
  connectionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  snippetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type SnippetVersionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SnippetVersion'] = ResolversParentTypes['SnippetVersion']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  snippetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  textField1?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  onGenerationStream?: SubscriptionResolver<Maybe<ResolversTypes['GenerationStreamEvent']>, "onGenerationStream", ParentType, ContextType, RequireFields<SubscriptionOnGenerationStreamArgs, 'snippetId'>>;
}>;

export type SystemAnalyticsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SystemAnalytics'] = ResolversParentTypes['SystemAnalytics']> = ResolversObject<{
  averageSnippetsPerUser?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalProjects?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalSnippets?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalUsers?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type VideoMetadataResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['VideoMetadata'] = ResolversParentTypes['VideoMetadata']> = ResolversObject<{
  aspectRatio?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  duration?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  fileSize?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  format?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  movementAmplitude?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  resolution?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  seed?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  style?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  Connection?: ConnectionResolvers<ContextType>;
  ConnectionStats?: ConnectionStatsResolvers<ContextType>;
  ConnectionTypeCount?: ConnectionTypeCountResolvers<ContextType>;
  CreateScenesResult?: CreateScenesResultResolvers<ContextType>;
  GenerationRecord?: GenerationRecordResolvers<ContextType>;
  GenerationResult?: GenerationResultResolvers<ContextType>;
  GenerationStreamEvent?: GenerationStreamEventResolvers<ContextType>;
  GraphNode?: GraphNodeResolvers<ContextType>;
  GraphTraversalResult?: GraphTraversalResultResolvers<ContextType>;
  ImageMetadata?: ImageMetadataResolvers<ContextType>;
  ModelConfig?: ModelConfigResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Position?: PositionResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Snippet?: SnippetResolvers<ContextType>;
  SnippetConnectionStat?: SnippetConnectionStatResolvers<ContextType>;
  SnippetVersion?: SnippetVersionResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  SystemAnalytics?: SystemAnalyticsResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  VideoMetadata?: VideoMetadataResolvers<ContextType>;
}>;

