import axios from 'axios';

const api = axios.create({
  baseURL: 'https://3svm0prw5g.execute-api.us-east-1.amazonaws.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
