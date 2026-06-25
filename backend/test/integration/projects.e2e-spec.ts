import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/modules/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../src/modules/common/interceptors/transform.interceptor';

describe('Projects Endpoints (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let orgId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    // Register a user
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `projects-e2e-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Project',
        lastName: 'Tester',
      });
    accessToken = regRes.body.data.accessToken;

    // Create an organization
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E Test Org', slug: `e2e-test-org-${Date.now()}` });
    orgId = orgRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/organizations/:orgId/projects', () => {
    it('201 — creates project as ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgId}/projects`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .send({ name: 'E2E Test Project', description: 'Test project description' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('E2E Test Project');
      expect(res.body.data.organizationId).toBe(orgId);
      projectId = res.body.data.id;
    });

    it('400 — missing project name', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgId}/projects`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .send({ description: 'No name provided' })
        .expect(400);
    });

    it('401 — unauthorized without token', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgId}/projects`)
        .send({ name: 'Unauthorized Project' })
        .expect(401);
    });
  });

  describe('GET /api/v1/organizations/:orgId/projects', () => {
    it('200 — returns projects list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgId}/projects`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/organizations/:orgId/projects/:id', () => {
    it('200 — returns single project', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgId}/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.data.id).toBe(projectId);
      expect(res.body.data.name).toBe('E2E Test Project');
    });

    it('404 — non-existent project', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgId}/projects/non-existent-id`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/organizations/:orgId/projects/:id', () => {
    it('200 — updates project', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${orgId}/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .send({ name: 'Updated Project Name' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Project Name');
    });
  });

  describe('DELETE /api/v1/organizations/:orgId/projects/:id', () => {
    it('200 — soft deletes project', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${orgId}/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .expect(200);
    });

    it('404 — deleted project no longer accessible', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgId}/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .expect(404);
    });
  });
});
