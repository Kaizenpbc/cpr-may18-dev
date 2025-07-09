import request from 'supertest';
import { app } from '../../server';
import pool from '../../config/database';

describe('Users API', () => {
  describe('GET /api/v1/users', () => {
    it('should return a list of users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/v1/users?page=1&limit=5')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('pagination');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it.skip('should return a user by id', async () => {
      // First, create a test user to ensure we have one
      const testUser = {
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'testhash',
        created_at: new Date()
      };
      
      const insertResult = await pool.query(
        'INSERT INTO users (username, email, password_hash, created_at) VALUES ($1, $2, $3, $4) RETURNING id',
        [testUser.username, testUser.email, testUser.password_hash, testUser.created_at]
      );
      const userId = insertResult.rows[0].id;

      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', userId);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/999999')
        .set('Accept', 'application/json');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 