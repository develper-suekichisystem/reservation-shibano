import { useState, useEffect } from 'react';
import { initLiff, getLineProfile, liff, IS_MOCK_LIFF } from '../lib/liff';
import { DEMO_USER } from '../lib/demoUser';

interface LiffState {
  isReady: boolean;
  isLoggedIn: boolean;
  userId: string | null;
  displayName: string | null;
  pictureUrl: string | null;
  error: string | null;
}

export function useLiff() {
  const [state, setState] = useState<LiffState>({
    isReady: false,
    isLoggedIn: false,
    userId: null,
    displayName: null,
    pictureUrl: null,
    error: null,
  });

  useEffect(() => {
    if (IS_MOCK_LIFF) {
      setState({
        isReady: true,
        isLoggedIn: true,
        userId: DEMO_USER.userId,
        displayName: DEMO_USER.displayName,
        pictureUrl: DEMO_USER.pictureUrl,
        error: null,
      });
      return;
    }

    async function init() {
      try {
        await initLiff();

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await getLineProfile();
        setState({
          isReady: true,
          isLoggedIn: true,
          userId: profile?.userId ?? null,
          displayName: profile?.displayName ?? null,
          pictureUrl: profile?.pictureUrl ?? null,
          error: null,
        });
      } catch (err) {
        setState(prev => ({
          ...prev,
          isReady: true,
          error: err instanceof Error ? err.message : 'LIFF初期化に失敗しました',
        }));
      }
    }

    init();
  }, []);

  return state;
}
