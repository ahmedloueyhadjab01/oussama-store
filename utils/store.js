function getTargetUserId(user) {
  if (user.role !== "admin" || !process.env.MAIN_STORE_USER_ID) return user.id;
  const mainId = parseInt(process.env.MAIN_STORE_USER_ID, 10);
  return isNaN(mainId) ? user.id : mainId;
}
module.exports = { getTargetUserId };
