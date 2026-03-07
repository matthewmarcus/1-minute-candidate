import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

export function useUnlockScreenOrientation() {
  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);
}
