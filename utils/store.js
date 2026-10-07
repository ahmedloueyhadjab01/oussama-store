const getStoreUserId = (user) => {
  if (user.role !== 'admin' || !process.env.MAIN_STORE_USER_ID) return user.id;
  const mainId = parseInt(process.env.MAIN_STORE_USER_ID, 10);
  return Number.isNaN(mainId) ? user.id : mainId;
};

module.exports = { getStoreUserId };