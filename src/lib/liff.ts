import liff from '@line/liff';

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string | undefined;

// VITE_LIFF_ID 未設定（or 'mock'）の場合はLIFFを使わずダミーユーザーで動かす
export const IS_MOCK_LIFF = !LIFF_ID || LIFF_ID === 'mock';

export async function initLiff(): Promise<void> {
  await liff.init({ liffId: LIFF_ID! });
}

export async function getLineProfile() {
  if (!liff.isLoggedIn()) return null;
  return liff.getProfile();
}

export { liff };
