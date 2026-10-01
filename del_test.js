const jwt = require('jsonwebtoken');
const secret = 'f6bccda9f5baf8e386ef81953732bb596b2b89cc4c5e74578e87de9245753a4999ac32e2725715072f324d2bfb5308024f9b225ea8aa95ecdf1c3b9945bdee19';
const token = jwt.sign({ id: 4, role: 'vendor' }, secret, { expiresIn: '1h' });

fetch('https://oussama-store.onrender.com/api/categories/39', {
  method: 'DELETE',
  headers: { 'Cookie': 'token=' + token }
}).then(res => res.text()).then(console.log).catch(console.error);

fetch('https://oussama-store.onrender.com/api/products/145', {
  method: 'DELETE',
  headers: { 'Cookie': 'token=' + token }
}).then(res => res.text()).then(console.log).catch(console.error);
