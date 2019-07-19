import * as assert from 'assert';
import * as request from 'supertest';

describe('pets', () => {
  const baseURL = 'http://localhost:4000';

  it('I can get pets', async () => {
    await request(baseURL)
      .get('/pets')
      .set('authorization', 'not-real-user')
      .set('accept', 'application/pets+json')
      .expect(200)
      .expect([
        { firstName: 'honey', lastName: 'hoguet' },
        { firstName: 'poseidon', lastName: 'hoguet' }
      ]);
  });

});
