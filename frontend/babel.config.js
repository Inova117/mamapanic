module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo (SDK 54) includes the reanimated/worklets plugin.
    presets: ['babel-preset-expo'],
  };
};
