module.exports = async (req, res) => {
  const { default: app } = await import("../dist/vercel.mjs");
  return app(req, res);
};
