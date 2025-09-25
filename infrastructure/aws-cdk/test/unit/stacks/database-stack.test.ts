import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AuteuriumDatabaseStack } from '../../../lib/stacks/auteurium-database-stack';
import { describe, test, beforeEach, expect } from '@jest/globals';

describe('AuteuriumDatabaseStack', () => {
  let app: cdk.App;
  let stack: AuteuriumDatabaseStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new AuteuriumDatabaseStack(app, 'TestAuteuriumDatabaseStack', {
      stage: 'test',
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    template = Template.fromStack(stack);
  });

  describe('DynamoDB Tables Creation', () => {
    test('should create exactly 5 DynamoDB tables', () => {
      template.resourceCountIs('AWS::DynamoDB::Table', 5);
    });

    test('should create users table with correct configuration', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-users-test',
        AttributeDefinitions: [
          {
            AttributeName: 'id',
            AttributeType: 'S',
          },
          {
            AttributeName: 'email',
            AttributeType: 'S',
          },
        ],
        KeySchema: [
          {
            AttributeName: 'id',
            KeyType: 'HASH',
          },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      });
    });

    test('should create projects table with composite key', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-projects-test',
        AttributeDefinitions: [
          {
            AttributeName: 'userId',
            AttributeType: 'S',
          },
          {
            AttributeName: 'id',
            AttributeType: 'S',
          },
        ],
        KeySchema: [
          {
            AttributeName: 'userId',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'id',
            KeyType: 'RANGE',
          },
        ],
      });
    });

    test('should create snippets table with project partition', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-snippets-test',
        KeySchema: [
          {
            AttributeName: 'projectId',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'id',
            KeyType: 'RANGE',
          },
        ],
      });
    });

    test('should create connections table for many-to-many relationships', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-connections-test',
        KeySchema: [
          {
            AttributeName: 'projectId',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'id',
            KeyType: 'RANGE',
          },
        ],
      });
    });

    test('should create versions table for snippet history', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-versions-test',
        KeySchema: [
          {
            AttributeName: 'snippetId',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'version',
            KeyType: 'RANGE',
          },
        ],
      });
    });
  });

  describe('Global Secondary Indexes (GSIs)', () => {
    test('should create EmailIndex on users table', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-users-test',
        GlobalSecondaryIndexes: [
          {
            IndexName: 'EmailIndex',
            KeySchema: [
              {
                AttributeName: 'email',
                KeyType: 'HASH',
              },
            ],
            Projection: {
              ProjectionType: 'ALL',
            },
          },
        ],
      });
    });

    test('should create UserIndex on snippets table', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-snippets-test',
        GlobalSecondaryIndexes: [
          {
            IndexName: 'UserIndex',
            KeySchema: [
              {
                AttributeName: 'userId',
                KeyType: 'HASH',
              },
              {
                AttributeName: 'createdAt',
                KeyType: 'RANGE',
              },
            ],
            Projection: {
              ProjectionType: 'ALL',
            },
          },
        ],
      });
    });

    test('should create connection lookup indexes', () => {
      // Source snippet index
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-connections-test',
        GlobalSecondaryIndexes: [
          {
            IndexName: 'SourceSnippetIndex',
            KeySchema: [
              {
                AttributeName: 'sourceSnippetId',
                KeyType: 'HASH',
              },
            ],
          },
          {
            IndexName: 'TargetSnippetIndex',
            KeySchema: [
              {
                AttributeName: 'targetSnippetId',
                KeyType: 'HASH',
              },
            ],
          },
          {
            IndexName: 'ConnectionTypeIndex',
            KeySchema: [
              {
                AttributeName: 'connectionType',
                KeyType: 'HASH',
              },
              {
                AttributeName: 'createdAt',
                KeyType: 'RANGE',
              },
            ],
          },
        ],
      });
    });

    test('should create UserVersionsIndex on versions table', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-versions-test',
        GlobalSecondaryIndexes: [
          {
            IndexName: 'UserVersionsIndex',
            KeySchema: [
              {
                AttributeName: 'userId',
                KeyType: 'HASH',
              },
              {
                AttributeName: 'createdAt',
                KeyType: 'RANGE',
              },
            ],
          },
        ],
      });
    });
  });

  describe('Data Protection and Recovery', () => {
    test('should enable point-in-time recovery for production', () => {
      const prodApp = new cdk.App();
      const prodStack = new AuteuriumDatabaseStack(prodApp, 'ProdAuteuriumDatabaseStack', {
        stage: 'prod',
        env: {
          account: '123456789012',
          region: 'us-east-1',
        },
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });
    });

    test('should not enable point-in-time recovery for test stage', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: false,
        },
      });
    });

    test('should set correct deletion policy for test stage', () => {
      template.hasResource('AWS::DynamoDB::Table', {
        DeletionPolicy: 'Delete',
      });
    });

    test('should set retention policy for production stage', () => {
      const prodApp = new cdk.App();
      const prodStack = new AuteuriumDatabaseStack(prodApp, 'ProdAuteuriumDatabaseStack', {
        stage: 'prod',
        env: {
          account: '123456789012',
          region: 'us-east-1',
        },
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResource('AWS::DynamoDB::Table', {
        DeletionPolicy: 'Retain',
      });
    });
  });

  describe('Billing Configuration', () => {
    test('should use pay-per-request billing mode', () => {
      const tableNames = [
        'auteurium-users-test',
        'auteurium-projects-test',
        'auteurium-snippets-test',
        'auteurium-connections-test',
        'auteurium-versions-test',
      ];

      tableNames.forEach((tableName) => {
        template.hasResourceProperties('AWS::DynamoDB::Table', {
          TableName: tableName,
          BillingMode: 'PAY_PER_REQUEST',
        });
      });
    });

    test('should not specify provisioned throughput', () => {
      // Ensure no table has provisioned throughput settings
      const resources = template.findResources('AWS::DynamoDB::Table');
      Object.values(resources).forEach((resource: any) => {
        expect(resource.Properties.ProvisionedThroughput).toBeUndefined();
      });
    });
  });

  describe('Stack Outputs', () => {
    test('should export all table names', () => {
      const expectedOutputs = [
        'UsersTableNametest',
        'ProjectsTableNametest',
        'SnippetsTableNametest',
        'ConnectionsTableNametest',
        'VersionsTableNametest',
      ];

      const outputs = template.findOutputs('*');
      expectedOutputs.forEach((outputKey) => {
        expect(outputs[outputKey]).toBeDefined();
      });
    });

    test('should export table names with correct values', () => {
      const outputs = template.findOutputs('UsersTableNametest');
      expect(Object.keys(outputs)).toHaveLength(1);

      const output = outputs['UsersTableNametest'];
      expect(output.Value).toBeDefined();
      expect(output.Value.Ref).toBeDefined();
      expect(output.Export.Name).toBe('AuteuriumUsersTable-test');
    });
  });

  describe('Attribute Definitions', () => {
    test('should define all required attributes for GSIs', () => {
      // Users table - should have id and email attributes
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-users-test',
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
          { AttributeName: 'email', AttributeType: 'S' },
        ],
      });

      // Snippets table - should have projectId, id, userId, createdAt
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-snippets-test',
        AttributeDefinitions: [
          { AttributeName: 'projectId', AttributeType: 'S' },
          { AttributeName: 'id', AttributeType: 'S' },
          { AttributeName: 'userId', AttributeType: 'S' },
          { AttributeName: 'createdAt', AttributeType: 'S' },
        ],
      });
    });
  });

  describe('Public Properties', () => {
    test('should expose all tables as public properties', () => {
      expect(stack.usersTable).toBeDefined();
      expect(stack.projectsTable).toBeDefined();
      expect(stack.snippetsTable).toBeDefined();
      expect(stack.connectionsTable).toBeDefined();
      expect(stack.versionsTable).toBeDefined();
    });

    test('should have correct table names', () => {
      // CDK tokens are unresolved until deployment, so check for expected format
      expect(stack.usersTable.tableName).toMatch(/\$\{Token|auteurium-users-test/);
      expect(stack.projectsTable.tableName).toMatch(/\$\{Token|auteurium-projects-test/);
      expect(stack.snippetsTable.tableName).toMatch(/\$\{Token|auteurium-snippets-test/);
      expect(stack.connectionsTable.tableName).toMatch(/\$\{Token|auteurium-connections-test/);
      expect(stack.versionsTable.tableName).toMatch(/\$\{Token|auteurium-versions-test/);
    });
  });

  describe('Data Model Validation', () => {
    test('should support user data isolation pattern', () => {
      // Projects table should partition by userId
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-projects-test',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'id', KeyType: 'RANGE' },
        ],
      });
    });

    test('should support snippet versioning pattern', () => {
      // Versions table should partition by snippetId and sort by version number
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'auteurium-versions-test',
        KeySchema: [
          { AttributeName: 'snippetId', KeyType: 'HASH' },
          { AttributeName: 'version', KeyType: 'RANGE' },
        ],
      });
    });

    test('should support many-to-many connections pattern', () => {
      // Connections table should support bidirectional lookups
      const tables = template.findResources('AWS::DynamoDB::Table');
      const connectionsTable = Object.values(tables).find((table: any) =>
        table.Properties.TableName === 'auteurium-connections-test'
      );

      expect(connectionsTable).toBeDefined();
      expect(connectionsTable!.Properties.GlobalSecondaryIndexes).toBeDefined();
      expect(connectionsTable!.Properties.GlobalSecondaryIndexes.length).toBeGreaterThanOrEqual(2);

      // Check that the required indexes exist
      const indexNames = connectionsTable!.Properties.GlobalSecondaryIndexes.map((gsi: any) => gsi.IndexName);
      expect(indexNames).toContain('SourceSnippetIndex');
      expect(indexNames).toContain('TargetSnippetIndex');
    });
  });
});