const jwt = require('jsonwebtoken');
const secret = 'f6bccda9f5baf8e386ef81953732bb596b2b89cc4c5e74578e87de9245753a4999ac32e2725715072f324d2bfb5308024f9b225ea8aa95ecdf1c3b9945bdee19';
const token = jwt.sign({ id: 4, role: 'vendor' }, secret, { expiresIn: '1h' });

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const body = '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="name"\r\n\r\nTest Product\r\n' +
  '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="price"\r\n\r\n1000\r\n' +
  '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="category_id"\r\n\r\n39\r\n' +
  '--' + boundary + '--\r\n';

fetch('https://oussama-store.onrender.com/api/products', {
  method: 'POST',
  headers: {
    'Cookie': 'token=' + token,
    'Content-Type': 'multipart/form-data; boundary=' + boundary
  },
  body: body
})
.then(res => res.text())
.then(data => console.log('Response:', data))
.catch(console.error);
