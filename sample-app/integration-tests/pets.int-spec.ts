import * as assert from 'assert';
import axios from 'axios';

describe('pets', () => {
  let http;

  before(() => {
    http = axios.create({ baseURL :  'http://localhost:4000' });
  });

  it('I can get pets', async () => {
    const { data, status } = await http.get('/pets');

    assert.equal(status, 200);
    assert.deepEqual(data, [{ name: 'honey'}, { name: 'poseidon'}]);
  });

  it('I can get pets by name', async () => {
    const { data, status } = await http.get('/pets?petName=honey');

    assert.equal(status, 200);
    assert.deepEqual(data, [{ name: 'honey'}]);
  });


  it('I can get pets by name', async () => {
    try{
      const { data, status } = await http.post('/pets?petName=honey', {});
    }
    catch(err){
      console.log(err.response.data);
    }
  });
});
