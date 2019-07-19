import * as assert from 'assert';
import axios from 'axios';

describe('pets', () => {
  let http;

  before(() => {
    http = axios.create({ baseURL :  'http://localhost:4000', headers: { authorization: 'not-real-user', accept: 'application/json'} });
  });

  it('I can get pets', async () => {
    const { data, status } = await http.get('/pets', { headers: { accept: 'application/pets+json'}});

    assert.equal(status, 200);
    assert.deepEqual(data, [{ firstName: 'honey', lastName: 'hoguet'}, { firstName: 'poseidon', lastName: 'hoguet'}]);
  });
});
