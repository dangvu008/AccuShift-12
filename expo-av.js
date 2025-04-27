// Mock implementation for expo-av
const Audio = {
  Sound: {
    createAsync: async () => ({
      sound: {
        playAsync: async () => {},
        unloadAsync: async () => {},
        setVolumeAsync: async () => {},
        setIsLoopingAsync: async () => {},
        setPositionAsync: async () => {},
        getStatusAsync: async () => ({ isLoaded: true, isPlaying: false }),
      },
      status: { isLoaded: true },
    }),
  },
};

export { Audio };
