import { GraphQLResolveInfo } from 'graphql';
import { GraphQLContext } from '../src/types/context';
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
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  label?: Maybe<Scalars['String']['output']>;
  projectId: Scalars['ID']['output'];
  sourceSnippet: Snippet;
  sourceSnippetId: Scalars['ID']['output'];
  targetSnippet: Snippet;
  targetSnippetId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
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

export type CreateSnippetInput = {
  categories?: InputMaybe<Array<Scalars['String']['input']>>;
  position: PositionInput;
  projectId: Scalars['ID']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  textField1?: InputMaybe<Scalars['String']['input']>;
  textField2?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createConnection: Connection;
  createProject: Project;
  createSnippet: Snippet;
  createUser: User;
  deleteConnection: Scalars['Boolean']['output'];
  deleteProject: Scalars['Boolean']['output'];
  deleteSnippet: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  resetUserPassword: Scalars['String']['output'];
  revertSnippet: Snippet;
  updateConnection: Connection;
  updateProject: Project;
  updateSnippet: Snippet;
};


export type MutationCreateConnectionArgs = {
  input: CreateConnectionInput;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
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
  id: Scalars['ID']['input'];
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSnippetArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationResetUserPasswordArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevertSnippetArgs = {
  id: Scalars['ID']['input'];
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
  me?: Maybe<User>;
  project?: Maybe<Project>;
  projects: Array<Project>;
  snippet?: Maybe<Snippet>;
  snippetVersions: Array<SnippetVersion>;
  systemAnalytics: SystemAnalytics;
  users: Array<User>;
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySnippetArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySnippetVersionsArgs = {
  snippetId: Scalars['ID']['input'];
};

export type Snippet = {
  __typename?: 'Snippet';
  categories: Array<Scalars['String']['output']>;
  connections: Array<Connection>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  position: Position;
  projectId: Scalars['ID']['output'];
  tags: Array<Scalars['String']['output']>;
  textField1: Scalars['String']['output'];
  textField2: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
  versions: Array<SnippetVersion>;
};

export type SnippetVersion = {
  __typename?: 'SnippetVersion';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  snippetId: Scalars['ID']['output'];
  textField1: Scalars['String']['output'];
  textField2: Scalars['String']['output'];
  version: Scalars['Int']['output'];
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
  textField2?: InputMaybe<Scalars['String']['input']>;
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
  CreateConnectionInput: CreateConnectionInput;
  CreateProjectInput: CreateProjectInput;
  CreateSnippetInput: CreateSnippetInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Position: ResolverTypeWrapper<Position>;
  PositionInput: PositionInput;
  Project: ResolverTypeWrapper<Project>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Snippet: ResolverTypeWrapper<Snippet>;
  SnippetVersion: ResolverTypeWrapper<SnippetVersion>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  SystemAnalytics: ResolverTypeWrapper<SystemAnalytics>;
  UpdateConnectionInput: UpdateConnectionInput;
  UpdateProjectInput: UpdateProjectInput;
  UpdateSnippetInput: UpdateSnippetInput;
  User: ResolverTypeWrapper<User>;
  UserRole: UserRole;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars['Boolean']['output'];
  Connection: Connection;
  CreateConnectionInput: CreateConnectionInput;
  CreateProjectInput: CreateProjectInput;
  CreateSnippetInput: CreateSnippetInput;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Mutation: Record<PropertyKey, never>;
  Position: Position;
  PositionInput: PositionInput;
  Project: Project;
  Query: Record<PropertyKey, never>;
  Snippet: Snippet;
  SnippetVersion: SnippetVersion;
  String: Scalars['String']['output'];
  SystemAnalytics: SystemAnalytics;
  UpdateConnectionInput: UpdateConnectionInput;
  UpdateProjectInput: UpdateProjectInput;
  UpdateSnippetInput: UpdateSnippetInput;
  User: User;
}>;

export type ConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Connection'] = ResolversParentTypes['Connection']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sourceSnippet?: Resolver<ResolversTypes['Snippet'], ParentType, ContextType>;
  sourceSnippetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  targetSnippet?: Resolver<ResolversTypes['Snippet'], ParentType, ContextType>;
  targetSnippetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  createConnection?: Resolver<ResolversTypes['Connection'], ParentType, ContextType, RequireFields<MutationCreateConnectionArgs, 'input'>>;
  createProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationCreateProjectArgs, 'input'>>;
  createSnippet?: Resolver<ResolversTypes['Snippet'], ParentType, ContextType, RequireFields<MutationCreateSnippetArgs, 'input'>>;
  createUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationCreateUserArgs, 'email' | 'name' | 'temporaryPassword'>>;
  deleteConnection?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteConnectionArgs, 'id'>>;
  deleteProject?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteProjectArgs, 'id'>>;
  deleteSnippet?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteSnippetArgs, 'id'>>;
  deleteUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteUserArgs, 'id'>>;
  resetUserPassword?: Resolver<ResolversTypes['String'], ParentType, ContextType, RequireFields<MutationResetUserPasswordArgs, 'id'>>;
  revertSnippet?: Resolver<ResolversTypes['Snippet'], ParentType, ContextType, RequireFields<MutationRevertSnippetArgs, 'id' | 'version'>>;
  updateConnection?: Resolver<ResolversTypes['Connection'], ParentType, ContextType, RequireFields<MutationUpdateConnectionArgs, 'id' | 'input'>>;
  updateProject?: Resolver<ResolversTypes['Project'], ParentType, ContextType, RequireFields<MutationUpdateProjectArgs, 'id' | 'input'>>;
  updateSnippet?: Resolver<ResolversTypes['Snippet'], ParentType, ContextType, RequireFields<MutationUpdateSnippetArgs, 'id' | 'input'>>;
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
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<QueryProjectArgs, 'id'>>;
  projects?: Resolver<Array<ResolversTypes['Project']>, ParentType, ContextType>;
  snippet?: Resolver<Maybe<ResolversTypes['Snippet']>, ParentType, ContextType, RequireFields<QuerySnippetArgs, 'id'>>;
  snippetVersions?: Resolver<Array<ResolversTypes['SnippetVersion']>, ParentType, ContextType, RequireFields<QuerySnippetVersionsArgs, 'snippetId'>>;
  systemAnalytics?: Resolver<ResolversTypes['SystemAnalytics'], ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type SnippetResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Snippet'] = ResolversParentTypes['Snippet']> = ResolversObject<{
  categories?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  connections?: Resolver<Array<ResolversTypes['Connection']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Position'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  textField1?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  textField2?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes['SnippetVersion']>, ParentType, ContextType>;
}>;

export type SnippetVersionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SnippetVersion'] = ResolversParentTypes['SnippetVersion']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  snippetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  textField1?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  textField2?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  Connection?: ConnectionResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Position?: PositionResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Snippet?: SnippetResolvers<ContextType>;
  SnippetVersion?: SnippetVersionResolvers<ContextType>;
  SystemAnalytics?: SystemAnalyticsResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
}>;

